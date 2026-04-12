const mongoose = require("mongoose");

// Station Schema (for legs)
const stationSchema = new mongoose.Schema({
  from: { type: String, default: "" },
  to: { type: String, default: "" },
});

// Leg Schema
const legSchema = new mongoose.Schema({
  stations: [stationSchema],
  blockTimeOn: { type: String, default: "" },
  blockTimeOff: { type: String, default: "" },
  flightTimeOn: { type: String, default: "" },
  flightTimeOff: { type: String, default: "" },
  totalTimeOn: { type: String, default: "" },
  totalTimeOff: { type: String, default: "" },
  date: { type: String, default: "" },
  passengers: { type: String, default: "" },
});

// Fuel Servicing Schema
const fuelServicingSchema = new mongoose.Schema({
  date: { type: String, default: "" },
  contCheck: { type: String, default: "" },
  mainRemG: { type: String, default: "" },
  mainAdd: { type: String, default: "" },
  mainTotal: { type: String, default: "" },
  fuelType: { type: String, enum: ["drum", "bowser"], default: "drum" },
  refuelerName: { type: String, default: "" },
  signature: { type: String, default: "" },
});

// Oil Servicing Schema
const oilServicingSchema = new mongoose.Schema({
  date: { type: String, default: "" },
  engineRem: { type: String, default: "" },
  engineAdd: { type: String, default: "" },
  engineTot: { type: String, default: "" },
  mrGboxRem: { type: String, default: "" },
  mrGboxAdd: { type: String, default: "" },
  mrGboxTot: { type: String, default: "" },
  trGboxRem: { type: String, default: "" },
  trGboxAdd: { type: String, default: "" },
  trGboxTot: { type: String, default: "" },
  remarks: { type: String, default: "" },
  signature: { type: String, default: "" },
});

// Work Item Schema
const workItemSchema = new mongoose.Schema({
  description: { type: String, default: "" },
  performedBy: { type: String, default: "" },
  date: { type: String, default: "" },
});

// Component Times Data Schema
const componentDataSchema = new mongoose.Schema({
  airframe: { type: String, default: "" },
  gearBoxMain: { type: String, default: "" },
  gearBoxTail: { type: String, default: "" },
  rotorMain: { type: String, default: "" },
  rotorTail: { type: String, default: "" },
  airframeNextInsp: { type: String, default: "" },
  engine: { type: String, default: "" },
  cycleN1: { type: String, default: "" },
  cycleN2: { type: String, default: "" },
  usage: { type: String, default: "" },
  landingCycle: { type: String, default: "" },
  engineNextInsp: { type: String, default: "" },
});

// Full Component Times Schema
const componentTimesSchema = new mongoose.Schema({
  broughtForwardData: componentDataSchema,
  thisFlightData: componentDataSchema,
  toDateData: componentDataSchema,
});

// Person Signature Schema
const personSignatureSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  signature: { type: String, default: "" },
  timestamp: { type: String, default: "" },
});

// Main Flight Log Schema
const flightLogSchema = new mongoose.Schema(
  {
    // Basic Information
    aircraftType: { type: String, default: "" },
    rpc: { type: String, default: "" },
    date: { type: String, default: "" },
    controlNo: { type: String, default: "" },
    sling: { type: String, default: "" },
    remarks: { type: String, default: "" },

    // Legs Data
    legs: [legSchema],

    // Servicing Data
    fuelServicing: [fuelServicingSchema],
    oilServicing: [oilServicingSchema],

    // Work Items
    workItems: [workItemSchema],

    // Component Times
    componentData: componentTimesSchema,

    // Status and Tracking
    createdBy: { type: String, default: "" },
    createdByName: { type: String, default: "" },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: [
        "pending_release",
        "pending_acceptance",
        "released",
        "accepted",
        "completed",
      ],
      default: "pending_release",
    },
    notifiedForCompletion: { type: Boolean, default: false },
    broughtForwardLocked: { type: Boolean, default: false },

    // Signatures
    releasedBy: personSignatureSchema,
    acceptedBy: personSignatureSchema,

    // Metadata
    id: { type: String, default: "" },
    dateAdded: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
flightLogSchema.index({ status: 1 });
flightLogSchema.index({ createdBy: 1 });
flightLogSchema.index({ date: -1 });
flightLogSchema.index({ rpc: 1 });

// Virtual property to get total number of legs
flightLogSchema.virtual("totalLegs").get(function () {
  return this.legs ? this.legs.length : 0;
});

// Instance methods
flightLogSchema.methods.release = function (name, signature) {
  this.status = "pending_acceptance";
  this.releasedBy = {
    name: name,
    signature: signature,
    timestamp: new Date().toISOString(),
  };
  return this;
};

flightLogSchema.methods.accept = function (name, signature) {
  this.status = "accepted";
  this.acceptedBy = {
    name: name,
    signature: signature,
    timestamp: new Date().toISOString(),
  };
  return this;
};

flightLogSchema.methods.complete = function () {
  this.status = "completed";
  return this;
};

// Static methods
flightLogSchema.statics.findByStatus = function (status) {
  return this.find({ status: status }).sort({ date: -1 });
};

flightLogSchema.statics.findByAircraft = function (aircraftRPC) {
  return this.find({ rpc: aircraftRPC }).sort({ date: -1 });
};

const FlightLog = mongoose.model("FlightLog", flightLogSchema);
module.exports = FlightLog;
