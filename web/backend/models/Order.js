const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Populated from Product
  product_name: { type: String, required: true },
  description: { type: String, required: true }, // The input for AI
  quantity: { type: Number, required: true },
  
  // AI Analysis Results (populated from Python API)
  ai_priority: { type: Number },
  confidence_score: { type: Number },
  requires_human_approval: { type: Boolean, default: false },
  human_approved: { type: Boolean, default: false }, // Explicit field for approval status
  
  decision_source: { type: String },
  decision_explanation: { type: String },
  trust_score_snapshot: { type: Number },
  ai_models_used: [{ type: String }],
  
  status: {
    type: String,
    enum: ['CREATED', 'AI_ANALYZED', 'HUMAN_APPROVAL_REQUIRED', 'HUMAN_APPROVED', 'APPROVED_FOR_SELLER', 'PACKED', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'REJECTED'],
    default: 'CREATED'
  },
  // New Phase 5 Enhanced: Customer Location context
  customer_location: {
      address: { type: String },
      city: { type: String },
      state: { type: String },
      latitude: { type: Number },
      longitude: { type: Number }
  },
  
  // New Phase 5 Fields - Priority Routing
  delivery_location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] } // [Longitude, Latitude]
  },
  delivery_type: { 
      type: String, 
      enum: ['STANDARD_SCHEDULED', 'INSTANT_LOCAL_FULFILLMENT'],
      default: 'STANDARD_SCHEDULED'
  },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Phase 5 Enhanced: Priority Fee
  priority_fee: { type: Number, default: 0 },
  fee_waived: { type: Boolean, default: false }, // Persist waiver state

  // Phase 5 Enhanced: Allocation Transparency & Override
  assignment_reason: { type: String },
  system_recommended_agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  override_reason: { type: String },
  base_price: { type: Number }, // Unit price of the product at time of order
  total_amount: { type: Number }, // Includes product price * quantity + priority_fee

}, { timestamps: true });

OrderSchema.index({ delivery_location: '2dsphere' }); // Enable geospatial queries

module.exports = mongoose.model('Order', OrderSchema);
