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
    assignOrder: async (order) => {
        // Only process high-priority orders (<=2) that have received Human Approval
        // Logic: Standard orders > 2 follow standard flow (manual assignment)
        
        if (!order.delivery_location || !order.delivery_location.coordinates) {
             console.log(`[PriorityService] Order ${order._id} missing location data. Skipping auto-routing.`);
             return order;
        }

        const [lng, lat] = order.delivery_location.coordinates;
        console.log(`[PriorityService] Processing High-Priority Order ${order._id} at [${lng}, ${lat}]`);

        // 1. Find Nearest Seller
        const nearestSeller = await findNearestUser('seller', lng, lat);
        
        // 2. Find Nearest Delivery Agent
        const nearestAgent = await findNearestUser('delivery_agent', lng, lat);

        // 3. Compare Distances & Assign
        let assignedUser = null;
        let deliveryType = 'STANDARD_SCHEDULED';

        const distToSeller = nearestSeller ? calculateDistance([lng, lat], nearestSeller.location.coordinates) : Infinity;
        const distToAgent = nearestAgent ? calculateDistance([lng, lat], nearestAgent.location.coordinates) : Infinity;

        console.log(`[PriorityService] Distances - Seller: ${distToSeller}km, Agent: ${distToAgent}km`);

        if (distToSeller < distToAgent) {
            assignedUser = nearestSeller;
            deliveryType = 'INSTANT_LOCAL_FULFILLMENT'; // Seller delivers directly
            console.log(`[PriorityService] Assigned to SELLER: ${nearestSeller.name} (Closer)`);
        } else if (nearestAgent) {
            assignedUser = nearestAgent;
            deliveryType = 'INSTANT_LOCAL_FULFILLMENT';
             console.log(`[PriorityService] Assigned to AGENT: ${nearestAgent.name}`);
        } else {
             console.log(`[PriorityService] No available routing candidates found.`);
        }

        if (assignedUser) {
            order.assigned_to = assignedUser._id;
            order.delivery_type = deliveryType;
            // Does NOT change status here, keeps 'APPROVED_FOR_SELLER' but adds metadata
            // Actually request says: "Mark delivery_type... Assign order"
        }

        return order;
    }
};

module.exports = PriorityService;
