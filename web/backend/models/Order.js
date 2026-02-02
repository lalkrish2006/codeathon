const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
