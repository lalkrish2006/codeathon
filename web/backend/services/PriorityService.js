const User = require('../models/User');

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula.
 * @param {number[]} coord1 [longitude, latitude]
 * @param {number[]} coord2 [longitude, latitude]
 * @returns {number} Distance in km
 */
const calculateDistance = (coord1, coord2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Radius of Earth in km
    const dLat = toRad(coord2[1] - coord1[1]);
    const dLon = toRad(coord2[0] - coord1[0]);
    const lat1 = toRad(coord1[1]);
    const lat2 = toRad(coord2[1]);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const findNearestUser = async (role, longitude, latitude) => {
    // GeoJSON query for nearest available user of specific role
    const users = await User.find({
        role: role,
        isAvailable: true,
        location: {
            $near: {
                $geometry: { type: "Point", coordinates: [longitude, latitude] }
            }
        }
    }).limit(1);
    
    return users.length > 0 ? users[0] : null;
};

const PriorityService = {
    /**
     * Calculates the best routing option without applying it.
     * Returns the recommended user and reasoning.
     */
    calculateRouting: async (order) => {
        if (!order.delivery_location || !order.delivery_location.coordinates) {
             return { assignedUser: null, reason: "Missing location data" };
        }

        const [lng, lat] = order.delivery_location.coordinates;
        
        // 1. Find Nearest Seller
        const nearestSeller = await findNearestUser('seller', lng, lat);
        
        // 2. Find Nearest Delivery Agent
        const nearestAgent = await findNearestUser('delivery_agent', lng, lat);

        // 3. Compare Distances & Assign
        let assignedUser = null;
        let deliveryType = 'STANDARD_SCHEDULED';
        let reason = "";

        const distToSeller = nearestSeller ? calculateDistance([lng, lat], nearestSeller.location.coordinates) : Infinity;
        const distToAgent = nearestAgent ? calculateDistance([lng, lat], nearestAgent.location.coordinates) : Infinity;

        if (distToSeller < distToAgent) {
            assignedUser = nearestSeller;
            deliveryType = 'INSTANT_LOCAL_FULFILLMENT'; // Seller delivers directly
            reason = `Seller is closer (${distToSeller.toFixed(2)}km) than nearest agent (${distToAgent === Infinity ? 'None' : distToAgent.toFixed(2) + 'km'}).`;
        } else if (nearestAgent) {
            assignedUser = nearestAgent;
            deliveryType = 'INSTANT_LOCAL_FULFILLMENT';
            reason = `Agent is closest available option (${distToAgent.toFixed(2)}km). Seller distance: ${distToSeller === Infinity ? 'N/A' : distToSeller.toFixed(2) + 'km'}.`;
        } else {
            reason = "No available routing candidates found (Seller/Agent unavailable or out of range).";
        }

        return { assignedUser, deliveryType, reason, distToSeller, distToAgent };
    },

    assignOrder: async (order) => {
        // Only process high-priority orders (<=2) that have received Human Approval
        // Logic: Standard orders > 2 follow standard flow (manual assignment)
        
        console.log(`[PriorityService] Processing Routing for Order ${order._id}`);

        const { assignedUser, deliveryType, reason } = await PriorityService.calculateRouting(order);

        if (assignedUser) {
            order.assigned_to = assignedUser._id;
            order.delivery_type = deliveryType;
            order.assignment_reason = reason; // Persist the logic
            console.log(`[PriorityService] Success: ${reason}`);
        } else {
             console.log(`[PriorityService] Failed: ${reason}`);
        }

        return order;
    }
};

module.exports = PriorityService;
