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
        const { product_name, description, quantity, user_id } = req.body;
        console.log(`[Backend] Received Order: ${product_name}`);

        // 1. Fetch User details for "Sender" context
        const user = await User.findById(user_id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // 2. Call Python AI API
        const payload = {
            id: `ORD-${Date.now()}`,
            description: description,
            sender: user.name, // Use user name as sender
            recipient_type: "residential", // Default for customer app
            metadata: { product: product_name, quantity: quantity }
        };

        let aiResponse = {};
        try {
            console.log(`[Backend] Calling Python AI at ${process.env.PYTHON_API_URL}`);
            const response = await axios.post(process.env.PYTHON_API_URL, payload);
            aiResponse = response.data;
            console.log(`[Backend] AI Response: Priority ${aiResponse.final_priority_score}`);
        } catch (err) {
            console.error("[Backend] AI Service Failed:", err.message);
            // Fallback default
            aiResponse = {
                final_priority_score: 10,
                confidence_score: 0.0,
                requires_human_approval: true,
                decision_source: "FALLBACK_ERROR",
                reasoning: "AI Service Unavailable",
                ai_models_used: [],
                sender_trust_score: user.trust_score || 1.0
            };
        }

        // 3. Create Order in DB
        const newOrder = new Order({
            user: user_id,
            product_name,
            description,
            quantity,
            
            ai_priority: aiResponse.final_priority_score,
            confidence_score: aiResponse.confidence_score,
            requires_human_approval: aiResponse.requires_human_approval,
            // If requires approval, it is NOT approved yet. If not, it is auto-approved?
            // "Auto-approval for Priority 3 and above" (from P4 task). 
            // Phase 4 logic handles `requires_human_approval` flag. 
            // So if `requires_human_approval` is false, we can set `human_approved` to true (auto) or null?
            // Let's set human_approved = !requires_human_approval
            human_approved: !aiResponse.requires_human_approval, 
            
            decision_source: aiResponse.decision_source,
            decision_explanation: aiResponse.reasoning,
            trust_score_snapshot: aiResponse.sender_trust_score,
            ai_models_used: aiResponse.ai_models_used,
            
            status: 'pending'
        });

        await newOrder.save();

        // 4. Trace & Real-time Update
        const io = req.app.get('io');
        // Emit to Admins
        io.emit('new_order', newOrder);

        res.status(201).json(newOrder);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

// GET ORDERS (Admin/Seller/Agent)
router.get('/', verifyToken, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }).populate('user', 'name email role');
        res.json(orders);
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

        order.human_approved = approved;
        order.status = approved ? 'approved' : 'rejected';
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
