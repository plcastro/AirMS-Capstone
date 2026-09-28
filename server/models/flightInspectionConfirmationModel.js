const mongoose = require('mongoose');
module.exports = mongoose.model('FlightInspectionConfirmation', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  rpc: { type: String, required: true },
  aircraftType: { type: String, required: true },
  allGood: { type: Boolean, required: true },
  remarks: { type: String, default: '' },
  signer: { type: mongoose.Schema.Types.Mixed, default: null },
  flightLogId: { type: mongoose.Schema.Types.ObjectId, default: null },
  expiresAt: { type: Date, required: true },
}, { timestamps: true }));
