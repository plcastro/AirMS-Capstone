const PreInspection = require("../models/preInspectionModel");

const createPreInspection = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      dateAdded:
        req.body.dateAdded || new Date().toLocaleDateString("en-US"),
      status: req.body.status || "pending",
    };

    const inspection = await PreInspection.create(payload);

    res.status(201).json({
      message: "Pre-inspection created successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error creating pre-inspection:", err);
    res.status(500).json({ message: "Failed to create pre-inspection" });
  }
};

const getAllPreInspections = async (req, res) => {
  try {
    const inspections = await PreInspection.find().sort({ createdAt: -1 });
    res.status(200).json({ status: "Ok", data: inspections });
  } catch (err) {
    console.error("Error fetching pre-inspections:", err);
    res.status(500).json({ message: "Failed to fetch pre-inspections" });
  }
};

const getPreInspectionById = async (req, res) => {
  try {
    const inspection = await PreInspection.findById(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: "Pre-inspection not found" });
    }

    res.status(200).json({ status: "Ok", data: inspection });
  } catch (err) {
    console.error("Error fetching pre-inspection:", err);
    res.status(500).json({ message: "Failed to fetch pre-inspection" });
  }
};

const updatePreInspection = async (req, res) => {
  try {
    const inspection = await PreInspection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true },
    );

    if (!inspection) {
      return res.status(404).json({ message: "Pre-inspection not found" });
    }

    res.status(200).json({
      message: "Pre-inspection updated successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error updating pre-inspection:", err);
    res.status(500).json({ message: "Failed to update pre-inspection" });
  }
};

const deletePreInspection = async (req, res) => {
  try {
    const inspection = await PreInspection.findByIdAndDelete(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: "Pre-inspection not found" });
    }

    res.status(200).json({
      message: "Pre-inspection deleted successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error deleting pre-inspection:", err);
    res.status(500).json({ message: "Failed to delete pre-inspection" });
  }
};

module.exports = {
  createPreInspection,
  getAllPreInspections,
  getPreInspectionById,
  updatePreInspection,
  deletePreInspection,
};
