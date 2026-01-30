const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'seller', 'admin', 'delivery_agent'], 
    default: 'customer' 
  },
  trust_score: { type: Number, default: 1.0 } // For sellers
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
