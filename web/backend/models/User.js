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
  trust_score: { type: Number, default: 1.0 }, 
  
  
  isAvailable: { type: Boolean, default: true },
  location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] } 
  },
  
  
  live_location: {
      latitude: { type: Number },
      longitude: { type: Number },
      last_updated: { type: Date }
  }
}, { timestamps: true });

UserSchema.index({ location: '2dsphere' }); 

module.exports = mongoose.model('User', UserSchema);
