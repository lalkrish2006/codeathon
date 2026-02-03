const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  base_description: { type: String, required: true }, // The GROUND TRUTH for AI
  price: { type: Number, required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stock_quantity: { type: Number, required: true, default: 0 },
  
  // Phase 5 Enhanced: Seller Ground Truth Location
  seller_location: {
    address: { type: String },
    city: { type: String },
    state: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
