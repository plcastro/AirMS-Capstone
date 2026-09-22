const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  flightLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'FlightLog', required: true, index: true },
  rpc: { type: String, required: true, index: true },
  description: { type: String, required: true, maxlength: 5000 },
  status: { type: String, enum: ['open', 'rectified', 'deferred'], default: 'open' },
  resolution: { type: String, default: '' },
  deferralReference: { type: String, default: '' },
  dueDate: { type: Date, default: null },
  evidence: { type: String, default: '', maxlength: 2000 },
  reportedBy: { type: String, required: true },
  signedBy: mongoose.Schema.Types.Mixed,
  history: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { timestamps: true, optimisticConcurrency: true });
module.exports = mongoose.model('FlightDefect', schema);
