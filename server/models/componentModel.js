const mongoose = require("mongoose");
const validator = require("validator");

const componentSchema = new mongoose.Schema({
  component_ID: {
    type: String,
    required: [true, "Please enter the component ID."],
    unique: true,
  },
  part_number: {
    type: String,
    required: [true, "Please enter the part number."],
  },
  name: {
    type: String,
    required: [true, "Please enter the component name."],
  },
  aircraft_model: {
    type: String,
    required: [true, "Please enter the aircraft model."],
  },
  category: {
    type: String,
    required: [true, "Please enter the component category."],
  },
  quantity_in_stock: {
    type: Number,
  },
  minimum_required: {
    type: Number,
  },
  unit: {
    type: String,
    required: [true, "Please enter the unit of measurement."],
  },
  status: {
    type: String,
    enum: ["available", "low_stock", "critical"],
    default: "available",
  },
  last_updated: {
    type: Date,
    default: Date.now,
  },
  source: {
    type: String,
    required: [true, "Please enter the source of the component."],
  },
  remarks: {
    type: String,
  },
});

const Component = mongoose.model("components", componentSchema);
module.exports = Component;
