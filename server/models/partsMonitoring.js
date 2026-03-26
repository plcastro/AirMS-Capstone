// models/partsMonitoring.js
const mongoose = require('mongoose');

const partsMonitoringSchema = new mongoose.Schema({
  aircraft: {
    type: String,
    required: true,
    unique: true
  },
  dateManufactured: {
    type: Date,
    required: true,
  },
  aircraftType: {
    type: String,
    required: true,
    unique: true
  },
  creepDamage:{
    type: String,
    required: true,
  },
  referenceData: {
    today: { type: Date, default: Date.now },
    acftTT: { type: Number, default: 902.1 },
    n1Cycles: { type: Number, default: 810 },
    n2Cycles: { type: Number, default: 302 },
    landings: { type: Number, default: 613 }
  },
  parts: [{
    _id: { type: String, required: true },
    rowType: { type: String, enum: ['part', 'header'], default: 'part' },
    // Make componentName not required for header rows by using a custom validator
    componentName: { 
      type: String,
      validate: {
        validator: function(v) {
          // If it's a header row, componentName can be empty
          if (this.rowType === 'header') return true;
          // For part rows, componentName is required
          return v && v.trim().length > 0;
        },
        message: 'Component name is required for part rows'
      }
    },
    hourLimit1: { type: String, default: '' },
    hourLimit2: { type: String, default: '' },
    hourLimit3: { type: String, default: '' },
    dayLimit: { type: String, default: '' },
    dayType: { type: String, default: '' },
    dateCW: { type: String, default: '' },
    hoursCW: { type: String, default: '' },
    daysRemaining: { type: String, default: '' },
    timeRemaining: { type: String, default: '' },
    dateDue: { type: String, default: '' },
    ttCycleDue: { type: String, default: '' },
    due: { type: String, default: '' },
    hd: { type: String, default: '' },
    timeSinceInstall: { type: String, default: '' },
    totalTimeSinceNew: { type: String, default: '' }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'system'
  }
}, {
  // Allow saving even if some validations fail
  strict: false
});

// Index for faster queries
partsMonitoringSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('PartsMonitoring', partsMonitoringSchema);