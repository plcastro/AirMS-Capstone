const PostInspection = require("../models/postInspectionModel");

const createPostInspection = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      dateAdded:
        req.body.dateAdded || new Date().toLocaleDateString("en-US"),
      status: req.body.status || "pending",
    };

    const inspection = await PostInspection.create(payload);

    res.status(201).json({
      message: "Post-inspection created successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error creating post-inspection:", err);
    res.status(500).json({ message: "Failed to create post-inspection" });
  }
};

const getAllPostInspections = async (req, res) => {
  try {
    const inspections = await PostInspection.find().sort({ createdAt: -1 });
    res.status(200).json({ status: "Ok", data: inspections });
  } catch (err) {
    console.error("Error fetching post-inspections:", err);
    res.status(500).json({ message: "Failed to fetch post-inspections" });
  }
};

const getPostInspectionById = async (req, res) => {
  try {
    const inspection = await PostInspection.findById(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: "Post-inspection not found" });
    }

    res.status(200).json({ status: "Ok", data: inspection });
  } catch (err) {
    console.error("Error fetching post-inspection:", err);
    res.status(500).json({ message: "Failed to fetch post-inspection" });
  }
};

const updatePostInspection = async (req, res) => {
  try {
    const inspection = await PostInspection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true },
    );

    if (!inspection) {
      return res.status(404).json({ message: "Post-inspection not found" });
    }

    res.status(200).json({
      message: "Post-inspection updated successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error updating post-inspection:", err);
    res.status(500).json({ message: "Failed to update post-inspection" });
  }
};

const deletePostInspection = async (req, res) => {
  try {
    const inspection = await PostInspection.findByIdAndDelete(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: "Post-inspection not found" });
    }

    res.status(200).json({
      message: "Post-inspection deleted successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error deleting post-inspection:", err);
    res.status(500).json({ message: "Failed to delete post-inspection" });
  }
};

module.exports = {
  createPostInspection,
  getAllPostInspections,
  getPostInspectionById,
  updatePostInspection,
  deletePostInspection,
};
