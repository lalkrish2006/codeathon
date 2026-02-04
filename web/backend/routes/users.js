const express = require('express');
const router = express.Router();
const User = require('../models/User');
const passport = require('passport');

// Middleware
const verifyToken = passport.authenticate('jwt', { session: false });

// LIST USERS (Admin/System usage)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { role } = req.query;
        let query = {};
        if (role) {
            query.role = role;
        }

        const users = await User.find(query).select('-password'); // Exclude password
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE LOCATION (For Delivery Agents / Sellers)
router.patch('/location', verifyToken, async (req, res) => {
    try {
        const { latitude, longitude, isAvailable } = req.body;
        const userId = req.user.id;
        
        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and Longitude are required" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update GeoJSON Location
        user.location = {
            type: 'Point',
            coordinates: [longitude, latitude]
        };

        // Optional: Update availability status
        if (typeof isAvailable !== 'undefined') {
            user.isAvailable = isAvailable;
        } else {
            // Implicitly set available if updating location
            user.isAvailable = true;
        }

        await user.save();
        res.json({ message: "Location updated", location: user.location, isAvailable: user.isAvailable });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Phase 5 Enhanced: Specific Agent Live Location Update
router.patch('/agent/location', verifyToken, async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const userId = req.user.id;

        if (req.user.role !== 'delivery_agent') {
            return res.status(403).json({ message: "Only delivery agents can update live location" });
        }
        
        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and Longitude are required" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update Live Location Field
        user.live_location = {
            latitude,
            longitude,
            last_updated: new Date()
        };
        
        // Sync with GeoJSON for Routing
        user.location = {
            type: 'Point',
            coordinates: [longitude, latitude]
        };

        // Enforce availability for live agents
        user.isAvailable = true;

        await user.save();
        res.json({ message: "Live location updated", live_location: user.live_location });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
