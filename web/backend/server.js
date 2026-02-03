require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const productRoutes = require('./routes/products');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

const passport = require('passport');
app.use(passport.initialize());
require('./config/passport')(passport); // Load Config

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for hackathon/demo
        methods: ["GET", "POST"]
    }
});

// Make io accessible in routes
app.set('io', io);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', require('./routes/users')); // Phase 5 Location Updates

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000 // Fail fast if DB is down
})
    .then(() => {
        console.log('MongoDB Connected');
        // Start Server only after DB connection
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error("MongoDB Connection Error:", err);
        process.exit(1); // Exit if DB fails
    });
