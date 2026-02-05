const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  product_name: { type: String, required: true },
  description: { type: String, required: true }, 
  quantity: { type: Number, required: true },
  
  
  ai_priority: { type: Number },
  confidence_score: { type: Number },
  requires_human_approval: { type: Boolean, default: false },
  human_approved: { type: Boolean, default: false }, 
  
  decision_source: { type: String },
  decision_explanation: { type: String },
  trust_score_snapshot: { type: Number },
  ai_models_used: [{ type: String }],
  
  status: {
    type: String,
    enum: ['CREATED', 'AI_ANALYZED', 'HUMAN_APPROVAL_REQUIRED', 'HUMAN_APPROVED', 'APPROVED_FOR_SELLER', 'PACKED', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'REJECTED'],
    default: 'CREATED'
  },
  
  customer_location: {
      address: { type: String },
      city: { type: String },
      state: { type: String },
      latitude: { type: Number },
      longitude: { type: Number }
  },
  
  
  delivery_location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] } 
  },
  delivery_type: { 
      type: String, 
      enum: ['STANDARD_SCHEDULED', 'INSTANT_LOCAL_FULFILLMENT'],
      default: 'STANDARD_SCHEDULED'
  },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  
  priority_fee: { type: Number, default: 0 },
  fee_waived: { type: Boolean, default: false }, 

  
  assignment_reason: { type: String },
  system_recommended_agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  override_reason: { type: String },
  base_price: { type: Number }, 
  total_amount: { type: Number }, 

}, { timestamps: true });

OrderSchema.index({ delivery_location: '2dsphere' }); 

module.exports = mongoose.model('Order', OrderSchema);
