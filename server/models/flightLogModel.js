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
  fuelType: {
    type: String,
    enum: ["drum", "truck", "bowser"],
    default: "drum",
  },
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
  id: { type: String, default: "" },
  selectedWorkTypes: { type: [String], default: [] },
  description: { type: String, default: "" },
  performedBy: { type: String, default: "" },
  date: { type: String, default: "" },
  aircraft: { type: String, default: "" },
  workDone: { type: String, default: "" },
  name: { type: String, default: "" },
  certificateNumber: { type: String, default: "" },
  signature: { type: String, default: "" },
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

// Bell 412 EP flight logs use a different component/servicing layout from the
// legacy AS350 form. Keep those fields in their own optional subdocument so
// existing records and clients retain their current shape.
const b412GearboxTimeSchema = new mongoose.Schema(
  {
    tsn: { type: String, default: "" },
    tso: { type: String, default: "" },
  },
  { _id: false },
);

const b412EngineTimeSchema = new mongoose.Schema(
  {
    tsn: { type: String, default: "" },
    tso: { type: String, default: "" },
    cycle: { type: String, default: "" },
  },
  { _id: false },
);

const b412ComponentTimeRowSchema = new mongoose.Schema(
  {
    airframe: { type: String, default: "" },
    mrGearbox: { type: b412GearboxTimeSchema, default: () => ({}) },
    tr90Gearbox: { type: b412GearboxTimeSchema, default: () => ({}) },
    tr42Gearbox: { type: b412GearboxTimeSchema, default: () => ({}) },
    landingCycle: { type: String, default: "" },
    engine1: { type: b412EngineTimeSchema, default: () => ({}) },
    engine2: { type: b412EngineTimeSchema, default: () => ({}) },
    sling: { type: String, default: "" },
    others: { type: String, default: "" },
  },
  { _id: false },
);

const b412ComponentDataSchema = new mongoose.Schema(
  {
    broughtForwardData: {
      type: b412ComponentTimeRowSchema,
      default: () => ({}),
    },
    thisFlightData: {
      type: b412ComponentTimeRowSchema,
      default: () => ({}),
    },
    toDateData: {
      type: b412ComponentTimeRowSchema,
      default: () => ({}),
    },
    airframeNextInspectionDueAt: { type: String, default: "" },
    engineNextInspectionDueAt: { type: String, default: "" },
  },
  { _id: false },
);

const b412PassengerRowSchema = new mongoose.Schema(
  {
    legs: {
      type: [String],
      default: () => Array(6).fill(""),
      validate: {
        validator: (legs) => legs.length <= 6,
        message: "A B412 passenger row cannot contain more than 6 legs",
      },
    },
  },
  { _id: false },
);

const b412FuelServicingSchema = new mongoose.Schema(
  {
    contCheck: { type: String, default: "" },
    mainTankRemaining: { type: String, default: "" },
    mainTankAdded: { type: String, default: "" },
    mainTankTotal: { type: String, default: "" },
    supplySystem1: { type: String, default: "" },
    supplySystem2: { type: String, default: "" },
    remarks: { type: String, default: "" },
    refuellerName: { type: String, default: "" },
    signature: { type: String, default: "" },
  },
  { _id: false },
);

const b412OilQuantitySchema = new mongoose.Schema(
  {
    remaining: { type: String, default: "" },
    added: { type: String, default: "" },
    total: { type: String, default: "" },
  },
  { _id: false },
);

const b412OilServicingSchema = new mongoose.Schema(
  {
    mechanicSignature: { type: String, default: "" },
    engine1: { type: b412OilQuantitySchema, default: () => ({}) },
    engine2: { type: b412OilQuantitySchema, default: () => ({}) },
    mrGearbox: { type: b412OilQuantitySchema, default: () => ({}) },
    reductionGearbox: {
      type: b412OilQuantitySchema,
      default: () => ({}),
    },
    tr42Gearbox: { type: b412OilQuantitySchema, default: () => ({}) },
    tr90Gearbox: { type: b412OilQuantitySchema, default: () => ({}) },
  },
  { _id: false },
);

const b412CorrectionItemSchema = new mongoose.Schema(
  {
    category: { type: String, default: "" },
    date: { type: String, default: "" },
    aircraftTotalTime: { type: String, default: "" },
    workDone: { type: String, default: "" },
    nameSign: { type: String, default: "" },
    certificateNo: { type: String, default: "" },
  },
  { _id: false },
);

const b412FlightLogDataSchema = new mongoose.Schema(
  {
    serialNumber: { type: String, default: "" },
    passengerRows: {
      type: [b412PassengerRowSchema],
      default: () =>
        Array.from({ length: 4 }, () => ({ legs: Array(6).fill("") })),
      validate: {
        validator: (rows) => rows.length <= 4,
        message: "A B412 flight log cannot contain more than 4 passenger rows",
      },
    },
    componentData: { type: b412ComponentDataSchema, default: () => ({}) },
    fuelServicing: {
      type: [b412FuelServicingSchema],
      default: () => Array.from({ length: 6 }, () => ({})),
      validate: {
        validator: (rows) => rows.length <= 6,
        message: "A B412 flight log cannot contain more than 6 fuel rows",
      },
    },
    oilServicing: {
      type: [b412OilServicingSchema],
      default: () => Array.from({ length: 2 }, () => ({})),
      validate: {
        validator: (rows) => rows.length <= 2,
        message: "A B412 flight log cannot contain more than 2 oil rows",
      },
    },
    discrepancyRemarks: { type: String, default: "" },
    correctionItems: {
      type: [b412CorrectionItemSchema],
      default: () => Array.from({ length: 3 }, () => ({})),
      validate: {
        validator: (rows) => rows.length <= 3,
        message: "A B412 flight log cannot contain more than 3 correction rows",
      },
    },
  },
  { _id: false },
);

// Person Signature Schema
const personSignatureSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  id: { type: String, default: "" },
  licenseNo: { type: String, default: "" },
  userId: { type: String, default: "" },
  title: { type: String, default: "" },
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

    // Bell 412 EP-specific form data. Undefined for legacy/AS350 records.
    b412Data: { type: b412FlightLogDataSchema, default: undefined },

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
