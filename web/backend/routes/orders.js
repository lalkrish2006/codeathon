const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User'); 
const axios = require('axios');
const PriorityService = require('../services/PriorityService'); 

const passport = require('passport');


const verifyToken = passport.authenticate('jwt', { session: false });


router.post('/', verifyToken, async (req, res) => {
    try {
        const { product_id, customer_context, quantity, user_id, latitude, longitude, customer_location } = req.body;
        
        
        const senderId = user_id || req.user.id;

        const Product = require('../models/Product');
        
        
        const product = await Product.findById(product_id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        console.log(`[Backend] Received Order for: ${product.name}`);

        
        const user = await User.findById(senderId);
        if (!user) return res.status(404).json({ message: "User not found" });

        
        
        
        const locContext = customer_location ? `Customer Location: ${customer_location.city || 'Unknown'}, ${customer_location.state || ''}.` : '';
        const combinedDescription = `Product: ${product.base_description}. Customer Context: ${customer_context}. ${locContext}`;

        
        
        const CRITICAL_KEYWORDS = ['medicine', 'medical', 'emergency', 'drug', 'pharmacy', 'health', 'aid', 'relief', 'urgent', 'doctor', 'hospital', 'mask', 'sanitizer', 'oxygen', 'injection', 'vaccine'];
        
        const productText = (product.name + " " + product.base_description).toLowerCase();
        const isCriticalCategory = CRITICAL_KEYWORDS.some(kw => productText.includes(kw));

        
        let aiResponse = {
            final_priority_score: 7, 
            confidence_score: 1.0,   
            requires_human_approval: false,
            decision_source: "RULE_ENGINE",
            reasoning: "Automatically routed to Standard Delivery: Product is not in a Critical Category.",
            ai_models_used: ["CategoryFilter"],
            sender_trust_score: user.trust_score || 1.0,
            ethical_category: "standard"
        };
        
        const hasContext = customer_context && customer_context.trim().length > 0;
        let shouldCallAI = isCriticalCategory && hasContext;

        if (isCriticalCategory && !hasContext) {
             console.log(`[Backend] Skipping AI: Critical Item '${product.name}' but no user context provided -> Standard Delivery.`);
        }

        
        if (shouldCallAI) {
            const payload = {
                id: `ORD-${Date.now()}`,
                description: combinedDescription,
                sender: user.name, 
                recipient_type: "residential", 
                metadata: { product: product.name, quantity: quantity, price: product.price }
            };

            
            try {
                 const healthUrl = process.env.PYTHON_API_URL.replace('/prioritize', '/health');
                 const healthRes = await axios.get(healthUrl, { timeout: 3000 });
                 console.log(`[Backend] [AI] Health Check OK: ${JSON.stringify(healthRes.data)}`);
            } catch (hErr) {
                 console.warn(`[Backend] [AI] WARNING: AI Service Unreachable (Health Check Failed): ${hErr.message}`);
            }

            try {
                console.log(`[Backend] Calling Python AI (Critical Item Detected)`, payload);
                const response = await axios.post(process.env.PYTHON_API_URL, payload, { timeout: 10000 });
                aiResponse = response.data;
                console.log(`[Backend] AI Response: Priority ${aiResponse.final_priority_score}`);
            } catch (err) {
                console.error("[Backend] AI Service Failed (Using Ethical Fallback):", err.message);
                 aiResponse = {
                    final_priority_score: 5, 
                    confidence_score: 1.0,   
                    requires_human_approval: true, 
                    decision_source: "ETHICAL_RULE",
                    reasoning: "AI Service Unavailable - Using Validated Ethical Rule (100% Confidence)",
                    ai_models_used: [],
                    sender_trust_score: user.trust_score || 1.0,
                    ethical_category: "standard" 
                };
            }
        } else {
             console.log(`[Backend] Skipping AI: Product '${product.name}' is eligible for Standard Delivery only.`);
        }

        
        let status = 'AI_ANALYZED'; 
        const priority = aiResponse.final_priority_score;
        const confidence = aiResponse.confidence_score;

        if (priority <= 2) {
             status = 'HUMAN_APPROVAL_REQUIRED';
             aiResponse.requires_human_approval = true;
        } else if (priority > 2 && priority <= 6) {
             status = 'AI_ANALYZED';
             
             if (confidence >= 0.8) {
                 status = 'APPROVED_FOR_SELLER';
                 aiResponse.requires_human_approval = false;
             }
        } else {
             
             status = 'APPROVED_FOR_SELLER';
             aiResponse.requires_human_approval = false;
        }

        
        let priorityFee = 0;
        
        if (aiResponse.requires_human_approval) {
            if (aiResponse.final_priority_score <= 1) {
                priorityFee = 50;
            } else if (aiResponse.final_priority_score <= 2) {
                priorityFee = 25;
            }
        }
        
        
        

        const basePrice = product.price * quantity;
        const totalAmount = basePrice + priorityFee;

        if (priorityFee > 0) {
            aiResponse.reasoning += `\n• [Priority Fee] Applied: $${priorityFee} (High Urgent Priority detected).`;
        }

        
        
        
        
        
        
        
        const getDistance = (lat1, lon1, lat2, lon2) => {
            if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
            const R = 6371; 
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLon = (lon2 - lon1) * (Math.PI / 180);
            const a = 
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        const custLat = latitude || (customer_location ? customer_location.latitude : 0);
        const custLon = longitude || (customer_location ? customer_location.longitude : 0);
        
        let assignedSellerId = product.seller; 
        let assignedAgentId = null;
        let sellerLocation = null;

        
        
        
        if (custLat !== 0 && custLon !== 0) {
            
            
            
            
            
            try {
                const allSellers = await User.find({ role: 'seller', isAvailable: true });
                
                if (allSellers.length > 0) {
                    let minSellerDist = Infinity;
                    let nearestSeller = null;

                    allSellers.forEach(s => {
                        const sLat = s.location?.coordinates[1] || 0;
                        const sLon = s.location?.coordinates[0] || 0;
                        const d = getDistance(custLat, custLon, sLat, sLon);
                        if (d < minSellerDist) {
                            minSellerDist = d;
                            nearestSeller = s;
                        }
                    });

                    if (nearestSeller) {
                        assignedSellerId = nearestSeller._id;
                        sellerLocation = nearestSeller.location;
                        console.log(`[Backend] [Proximity] Assigned Nearest Seller: ${nearestSeller.name} (${minSellerDist.toFixed(2)} km)`);
                    }
                }
            } catch (pErr) {
                console.warn("[Backend] Proximity Seller Assignment Failed:", pErr.message);
            }

            
            if (aiResponse.final_priority_score <= 2) {
                if (sellerLocation) {
                    try {
                        const allAgents = await User.find({ role: 'delivery_agent', isAvailable: true });
                        
                        if (allAgents.length > 0) {
                            let minAgentDist = Infinity;
                            let nearestAgent = null;
                            const sLat = sellerLocation.coordinates[1];
                            const sLon = sellerLocation.coordinates[0];

                            allAgents.forEach(a => {
                                const aLat = a.location?.coordinates[1] || 0;
                                const aLon = a.location?.coordinates[0] || 0;
                                const d = getDistance(sLat, sLon, aLat, aLon);
                                if (d < minAgentDist) {
                                    minAgentDist = d;
                                    nearestAgent = a;
                                }
                            });

                            if (nearestAgent) {
                                assignedAgentId = nearestAgent._id;
                                console.log(`[Backend] [Proximity] Assigned Nearest Agent: ${nearestAgent.name} (${minAgentDist.toFixed(2)} km from Seller)`);
                                
                                
                                aiResponse.reasoning += `\n• [Auto-Assign] Nearest Agent ${nearestAgent.name} assigned via proximity logic.`;
                            } else {
                                aiResponse.reasoning += `\n• [Auto-Assign] No agents nearby.`;
                            }
                        }
                    } catch (aErr) {
                        console.warn("[Backend] Proximity Agent Assignment Failed:", aErr.message);
                    }
                }
            } else {
                 console.log("[Backend] Priority > 2 → manual admin assignment required");
                 aiResponse.reasoning += `\n• [Manual Allocation] Priority ${aiResponse.final_priority_score} > 2. Delivery agent manual assignment required.`;
            }
        }
        

        
        const newOrder = new Order({
            user: senderId,
            seller: assignedSellerId, 
            product_name: product.name, 
            description: combinedDescription, 
            quantity,
            
            
            delivery_location: {
                type: 'Point',
                coordinates: (latitude && longitude) ? [longitude, latitude] : 
                             (customer_location && customer_location.longitude) ? [customer_location.longitude, customer_location.latitude] : [0, 0]
            },
            customer_location: customer_location || {},
            
            ai_priority: aiResponse.final_priority_score,
            confidence_score: aiResponse.confidence_score,
            requires_human_approval: aiResponse.requires_human_approval,
            human_approved: !aiResponse.requires_human_approval, 
            
            decision_source: aiResponse.decision_source,
            decision_explanation: aiResponse.reasoning,
            trust_score_snapshot: aiResponse.sender_trust_score,
            ai_models_used: aiResponse.ai_models_used,
            
            status: status,

            
            assigned_to: assignedAgentId, 

            
            base_price: product.price, 
            priority_fee: priorityFee,
            total_amount: totalAmount
        });

        
        
        try {
             
             
             const routingResult = await PriorityService.calculateRouting(newOrder);
             
             if (routingResult.assignedUser) {
                 newOrder.system_recommended_agent = routingResult.assignedUser._id;
                 newOrder.assignment_reason = routingResult.reason;
                 console.log(`[Backend] Pre-calculated Route: ${routingResult.reason}`);
             } else {
                 newOrder.assignment_reason = routingResult.reason || "No suitable agent found at creation";
             }
        } catch (routeErr) {
             console.warn(`[Backend] Routing pre-calc failed: ${routeErr.message}`);
        }

        await newOrder.save();

        
        const io = req.app.get('io');
        
        io.emit('new_order', newOrder);

        res.status(201).json(newOrder);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});


router.get('/', verifyToken, async (req, res) => {
    try {
        let query = {};
        
        
        
        
        
        
        
        
        

        if (req.user.role === 'seller') {
            query = { 
                status: { $in: ['APPROVED_FOR_SELLER', 'PACKED', 'READY_FOR_PICKUP'] } 
            };
        } else if (req.user.role === 'delivery_agent') {
            query = { 
                assigned_to: req.user.id,
                status: { $in: ['READY_FOR_PICKUP', 'IN_TRANSIT'] }
            };
        } else if (req.user.role === 'customer') {
            
            
            query = { user: req.user.id };
        }

        
        let orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('user', 'name email role location live_location')
            .populate('seller', 'name email location')
            .populate('assigned_to', 'name email role location live_location');

        
        if (req.user.role === 'customer') {
            orders = orders.map(o => {
                const orderObj = o.toObject();
                
                return {
                    _id: orderObj._id,
                    product_name: orderObj.product_name,
                    quantity: orderObj.quantity,
                    base_price: orderObj.base_price || 0, 
                    total_amount: orderObj.total_amount || 0, 
                    priority_fee: orderObj.priority_fee || 0, 
                    fee_waived: orderObj.fee_waived || false, 
                    status: orderObj.status,
                    createdAt: orderObj.createdAt,
                    
                    user: { _id: orderObj.user._id, name: orderObj.user.name },
                    
                    
                    
                    
                    
                    assigned_to: orderObj.assigned_to ? { name: orderObj.assigned_to.name } : null,
                };
            });
            console.log(`[Backend] Sanitized ${orders.length} orders for Customer view.`);
        }
            
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) return res.status(404).json({ message: "Order not found" });

        
        if (req.user.role === 'seller') {
            
            
            
            if (status === 'PACKED' && order.status === 'APPROVED_FOR_SELLER') {
                order.status = 'PACKED';
            } else if (status === 'READY_FOR_PICKUP' && order.status === 'PACKED') {
                order.status = 'READY_FOR_PICKUP';
                
                const io = req.app.get('io');
                io.emit('order_ready_for_pickup', order);
            } else {
                 return res.status(403).json({ message: "Invalid status transition for Seller" });
            }
        } else if (req.user.role === 'delivery_agent') {
            
            
            
            if (status === 'IN_TRANSIT' && order.status === 'READY_FOR_PICKUP') {
                order.status = 'IN_TRANSIT';
            } else if (status === 'DELIVERED' && (order.status === 'IN_TRANSIT' || order.status === 'READY_FOR_PICKUP')) {
                order.status = 'DELIVERED';
                
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


router.patch('/:id/approve', verifyToken, async (req, res) => {
    try {
        const { approved, reasoning } = req.body; 
        const order = await Order.findById(req.params.id);
        
        if (!order) return res.status(404).json({ message: "Order not found" });

        
        
        
        
        if (approved) {
            const { waive_fee } = req.body;
            
            
            if (waive_fee && order.priority_fee > 0) {
                const oldFee = order.priority_fee;
                order.priority_fee = 0;
                order.fee_waived = true;
                order.total_amount = order.total_amount - oldFee;
                order.decision_explanation += `\n\n[Human Action] Priority Fee ($${oldFee}) WAIVED by Admin.`;
            }
            
            
            
            if (order.ai_priority <= 2) {
                 const { override_agent_id } = req.body;
                 
                 if (override_agent_id) {
                     
                     order.assigned_to = override_agent_id;
                     order.delivery_type = 'INSTANT_LOCAL_FULFILLMENT'; 
                     order.decision_source = 'ADMIN_OVERRIDE'; 
                     order.override_reason = reasoning; 
                     order.assignment_reason += ` [OVERRIDE: assigned to ${override_agent_id}]`;
                     
                     console.log(`[Backend] Admin OVERRODE routing for Order ${order._id} -> ${override_agent_id}`);
                 } else {
                     
                     await PriorityService.assignOrder(order);
                 }
            }

            order.status = 'APPROVED_FOR_SELLER';
            
            
            const io = req.app.get('io');
            io.emit('order_approved_for_seller', order);
        } else {
             
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


router.patch('/:id/assign', verifyToken, async (req, res) => {
    try {
        const { agent_id } = req.body;
        
        
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Admin access required" });
        }

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const User = require('../models/User');
        const agent = await User.findById(agent_id);
        if (!agent || agent.role !== 'delivery_agent') {
            return res.status(400).json({ message: "Valid Delivery Agent required" });
        }

        order.assigned_to = agent_id;
        order.assignment_reason += `\n[Manual] Admin assigned to ${agent.name} manually.`;
        
        
        if (order.status === 'APPROVED_FOR_SELLER' || order.status === 'AI_ANALYZED') {
             
             
        }

        await order.save();

        const io = req.app.get('io');
        
        io.emit('delivery_assigned', order);
        io.emit('order_updated', order);

        console.log(`[Backend] Admin manually assigned Order ${order._id} to ${agent.name}`);

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
