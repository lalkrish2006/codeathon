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


app.use(cors());
app.use(express.json());

const passport = require('passport');
app.use(passport.initialize());
require('./config/passport')(passport); 


const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});


app.set('io', io);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});


app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', require('./routes/users')); 


mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000 
})
    .then(() => {
        console.log('MongoDB Connected');
        
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error("MongoDB Connection Error:", err);
        process.exit(1); 
    });
