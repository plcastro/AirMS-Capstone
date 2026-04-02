const partsRequisitionModel = require("../models/partsRequisitionModel");

const getAllRequisitions = async (req, res) => {
  try {
    const requisitions = await partsRequisitionModel
      .find()
      .sort({ createdAt: -1 });
    res.status(200).json(requisitions);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getRequisitionById = async (req, res) => {
  try {
    const requisition = await partsRequisitionModel.findById(req.params.id);
    if (!requisition) {
      return res.status(404).json({ message: "Requisition not found" });
    }
    res.status(200).json(requisition);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const createRequisition = async (req, res) => {
  try {
    const newRequisition = new partsRequisitionModel(req.body);
    const savedRequisition = await newRequisition.save();
    res.status(201).json(savedRequisition);
  } catch (error) {
    res.status(400).json({ message: "Invalid data", error: error.message });
  }
};

const updateRequisitionStatus = async (req, res) => {
  try {
    const updatedRequisition = await partsRequisitionModel.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, dateReceived: req.body.dateReceived },
      { new: true, runValidators: true },
    );

    if (!updatedRequisition) {
      return res.status(404).json({ message: "Requisition not found" });
    }
    res.status(200).json(updatedRequisition);
  } catch (error) {
    res.status(400).json({ message: "Update failed", error: error.message });
  }
};

module.exports = {
  getAllRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisitionStatus,
};
