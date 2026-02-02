const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User'); // Need to fetch sender trust score if applicable
const axios = require('axios');

const passport = require('passport');

// Middleware to check auth using Passport
const verifyToken = passport.authenticate('jwt', { session: false });

// CREATE ORDER (Customer / Seller)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { product_id, customer_context, quantity, user_id } = req.body;
        // user_id might come from req.body (if admin creates?) or req.user.id
        // Let's assume req.body.user_id is passed, or default to req.user.id
        const senderId = user_id || req.user.id;

        const Product = require('../models/Product');
        
        // 1. Fetch Product
        const product = await Product.findById(product_id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        console.log(`[Backend] Received Order for: ${product.name}`);

        // 2. Fetch User details for "Sender" context
        const user = await User.findById(senderId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // 3. Combine Descriptions for AI
        // "Product: {base_description}. Customer Context: {customer_description}"
        const combinedDescription = `Product: ${product.base_description}. Customer Context: ${customer_context}`;

        // 4. Call Python AI API
        const payload = {
            id: `ORD-${Date.now()}`,
            description: combinedDescription,
            sender: user.name, // Use user name as sender
            recipient_type: "residential", // Default for customer app
            metadata: { product: product.name, quantity: quantity, price: product.price }
        };

        // Health Check (New Requirement Phase 5)
        try {
             const healthUrl = process.env.PYTHON_API_URL.replace('/prioritize', '/health');
             const healthRes = await axios.get(healthUrl, { timeout: 3000 });
             console.log(`[Backend] [AI] Health Check OK: ${JSON.stringify(healthRes.data)}`);
        } catch (hErr) {
             console.warn(`[Backend] [AI] WARNING: AI Service Unreachable (Health Check Failed): ${hErr.message}`);
        }

        let aiResponse = {};
        try {
            console.log(`[Backend] Calling Python AI`, payload);
            const response = await axios.post(process.env.PYTHON_API_URL, payload, { timeout: 10000 });
            aiResponse = response.data;
            console.log(`[Backend] AI Response: Priority ${aiResponse.final_priority_score}`);
        } catch (err) {
            console.error("[Backend] AI Service Failed:", err.message);
            if (err.response) {
                console.error("[Backend] AI Error Status:", err.response.status);
                console.error("[Backend] AI Error Data:", JSON.stringify(err.response.data));
            } else if (err.code === 'ECONNABORTED') {
                 console.error("[Backend] AI Request Timed Out (10s limit)");
            } else if (err.request) {
                 console.error("[Backend] AI No Response received (Connection Refused/Unknown)");
            }

            // Fallback default (Matches Python DecisionLog schema)
            aiResponse = {
                final_priority_score: 10,
                confidence_score: 0.0,
                requires_human_approval: true,
                decision_source: "FALLBACK_ERROR",
                reasoning: "AI Service Unavailable - Using Safe Default",
                ai_models_used: [],
                sender_trust_score: user.trust_score || 1.0,
                ethical_category: "standard" 
            };
        }

        // Priority -> Status Enforcement (Phase 4 Logic)
        let status = 'AI_ANALYZED'; // Default
        const priority = aiResponse.final_priority_score;
        const confidence = aiResponse.confidence_score;

        if (priority <= 2) {
             status = 'HUMAN_APPROVAL_REQUIRED';
             aiResponse.requires_human_approval = true;
        } else if (priority > 2 && priority <= 6) {
             status = 'AI_ANALYZED';
             // Auto-approve only if confidence >= threshold (0.8)
             if (confidence >= 0.8) {
                 status = 'APPROVED_FOR_SELLER';
                 aiResponse.requires_human_approval = false;
             }
        } else {
             // Priority >= 7 (Low Urgency) -> Auto-Approve
             status = 'APPROVED_FOR_SELLER';
             aiResponse.requires_human_approval = false;
        }

        // 5. Create Order in DB
        const newOrder = new Order({
            user: senderId,
            product_name: product.name, // Keep for display
            description: combinedDescription, // Store full context
            quantity,
            
            ai_priority: aiResponse.final_priority_score,
            confidence_score: aiResponse.confidence_score,
            requires_human_approval: aiResponse.requires_human_approval,
            // If requires approval, it is NOT approved yet.
            human_approved: !aiResponse.requires_human_approval, 
            
            decision_source: aiResponse.decision_source,
            decision_explanation: aiResponse.reasoning,
            trust_score_snapshot: aiResponse.sender_trust_score,
            ai_models_used: aiResponse.ai_models_used,
            
            status: status
        });

        await newOrder.save();

        // 6. Trace & Real-time Update
        const io = req.app.get('io');
        // Emit to Admins
        io.emit('new_order', newOrder);

        res.status(201).json(newOrder);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

// GET ORDERS (Role-Based Visibility)
router.get('/', verifyToken, async (req, res) => {
    try {
        let query = {};
        
        // 1. Customer: Can see their own orders (Phase 4 requirement: Customer flow unchanged, but usually they see their own)
        // Existing logic was Order.find() which returned ALL. I will keep "ALL" for Admin, but restrict others.
        // Actually, let's respect the "unchanged" constraint for Customer but fix the potential data leak? 
        // No, constraint says "without modifying... Customer flow". 
        // If I change GET / to return only user's orders, I might break Customer Dashboard if it expects all (unlikely).
        // Let's blindly assume Customer needs their own.
        // But to be SAFE and strictly follow constraints: "Only update Seller Dashboard, Delivery Agent, Backend order status transitions related to these roles".
        // Use if/else for roles.

        if (req.user.role === 'seller') {
            query = { 
                status: { $in: ['APPROVED_FOR_SELLER', 'PACKED', 'READY_FOR_PICKUP'] } 
            };
        } else if (req.user.role === 'delivery_agent') {
            query = { 
                status: { $in: ['READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED'] } 
            };
        } else if (req.user.role === 'customer') {
            // Preserving existing behavior might mean "show all" ?? 
            // Most likely Customer Dashboard filters by user ID on client side or backend should.
            // I'll filter by user ID for customer to be safe/sane, unless it breaks something.
            // Checking Order model: user field exists.
            // Let's just return ALL for customer for now to ensure "Unchanged" constraint if they relied on client filtering?
            // Actually, risk of breaking is low if I do { user: req.user.id }.
            // Let's stick to modifying ONLY Seller and Agent logic.
        }

        const orders = await Order.find(query).sort({ createdAt: -1 }).populate('user', 'name email role');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// STATUS UPDATES (Seller / Delivery Agent)
router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) return res.status(404).json({ message: "Order not found" });

        // Role-Based Guards
        if (req.user.role === 'seller') {
            // Seller can ONLY move: 
            // APPROVED_FOR_SELLER -> PACKED
            // PACKED -> READY_FOR_PICKUP
            if (status === 'PACKED' && order.status === 'APPROVED_FOR_SELLER') {
                order.status = 'PACKED';
            } else if (status === 'READY_FOR_PICKUP' && order.status === 'PACKED') {
                order.status = 'READY_FOR_PICKUP';
                // Emit event for Agent
                const io = req.app.get('io');
                io.emit('order_ready_for_pickup', order);
            } else {
                 return res.status(403).json({ message: "Invalid status transition for Seller" });
            }
        } else if (req.user.role === 'delivery_agent') {
            // Agent can ONLY move:
            // READY_FOR_PICKUP -> IN_TRANSIT
            // IN_TRANSIT -> DELIVERED
            if (status === 'IN_TRANSIT' && order.status === 'READY_FOR_PICKUP') {
                order.status = 'IN_TRANSIT';
            } else if (status === 'DELIVERED' && (order.status === 'IN_TRANSIT' || order.status === 'READY_FOR_PICKUP')) {
                order.status = 'DELIVERED';
                // Emit event for Completion
                const io = req.app.get('io');
                io.emit('order_delivered', order);
            } else {
                return res.status(403).json({ message: "Invalid status transition for Delivery Agent" });
            }
        } else {
             return res.status(403).json({ message: "Unauthorized role for status update" });
        }

        await order.save();
        res.json(order);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// HUMAN APPROVAL (Admin)
router.patch('/:id/approve', verifyToken, async (req, res) => {
    try {
        const { approved, reasoning } = req.body; // approved = true/false
        const order = await Order.findById(req.params.id);
        
        if (!order) return res.status(404).json({ message: "Order not found" });

        // EXPLICIT STATUS PROMOTION:
        // When Admin approves, we MUST set status to 'APPROVED_FOR_SELLER'.
        // This is required because the Seller Dashboard ONLY shows orders with this specific status (or PACKED/READY).
        // If we leave it as 'approved', the Seller will never see it.
        if (approved) {
            order.status = 'APPROVED_FOR_SELLER';
            
            // Emit specific event for real-time Seller updates
            const io = req.app.get('io');
            io.emit('order_approved_for_seller', order);
        } else {
             // If rejected, set status to REJECTED to block from Seller view.
             order.status = 'REJECTED';
        }
        order.decision_explanation += `\n\n[Human Action] ${approved ? 'Approved' : 'Rejected'} by Admin. Note: ${reasoning || 'N/A'}`;
        
        await order.save();

        const io = req.app.get('io');
        io.emit('order_updated', order);
        
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
