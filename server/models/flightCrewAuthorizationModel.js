const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  licenseNo: { type: String, required: true },
  licenseType: { type: String, required: true },
  validUntil: { type: Date, required: true },
  aircraft: { type: [String], required: true },
  reference: { type: String, required: true },
  active: { type: Boolean, default: true },
  recordedBy: { type: String, required: true },
  history: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { timestamps: true, optimisticConcurrency: true });
module.exports = mongoose.model('FlightCrewAuthorization', schema);
