const Component = require("../models/componentModel");

/*
Utility: Calculate inventory status
*/
const calculateStatus = (quantity, minimum) => {
  if (quantity <= minimum * 0.25) return "critical";
  if (quantity <= minimum) return "low stock";
  return "available";
};

const createComponent = async (req, res) => {
  try {
    const data = req.body;

    if (
      data.quantity_in_stock !== undefined &&
      data.minimum_required !== undefined
    ) {
      data.status = calculateStatus(
        data.quantity_in_stock,
        data.minimum_required,
      );
    }

    data.last_updated = new Date();

    const component = await Component.create(data);

    res.status(201).json({
      success: true,
      data: component,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllComponents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      aircraft_model,
      category,
      status,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { component_ID: { $regex: search, $options: "i" } },
        { part_number: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    if (aircraft_model) query.aircraft_model = aircraft_model;
    if (category) query.category = category;
    if (status) query.status = status;

    const components = await Component.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ last_updated: -1 });

    const total = await Component.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: components,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getComponentById = async (req, res) => {
  try {
    const component = await Component.findById(req.params.id);

    if (!component) {
      return res.status(404).json({
        success: false,
        message: "Component not found",
      });
    }

    res.status(200).json({
      success: true,
      data: component,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateComponent = async (req, res) => {
  try {
    const existing = await Component.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Component not found",
      });
    }

    const updatedData = req.body;

    if (
      updatedData.quantity_in_stock !== undefined ||
      updatedData.minimum_required !== undefined
    ) {
      const quantity =
        updatedData.quantity_in_stock ?? existing.quantity_in_stock;

      const minimum = updatedData.minimum_required ?? existing.minimum_required;

      updatedData.status = calculateStatus(quantity, minimum);
    }

    updatedData.last_updated = new Date();

    const component = await Component.findByIdAndUpdate(
      req.params.id,
      updatedData,
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      data: component,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteComponent = async (req, res) => {
  try {
    const component = await Component.findByIdAndDelete(req.params.id);

    if (!component) {
      return res.status(404).json({
        success: false,
        message: "Component not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Component deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createComponent,
  getAllComponents,
  getComponentById,
  updateComponent,
  deleteComponent,
};
