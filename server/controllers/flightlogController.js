const FlightLog = require("../models/flightLogModel");

// Helper function to get user role from token
const getUserRole = (user) => {
  // Try different possible field names based on your JWT payload
  return user.role || user.userRole || user.jobTitle || user.userType;
};

// @desc    Create a new flight log
// @route   POST /api/flight-logs
// @access  Private (pilot or mechanic)
// In flightlogController.js - remove all req.user references
const createFlightLog = async (req, res) => {
  try {
    console.log("=== CREATE FLIGHT LOG CALLED ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const flightLogData = req.body;

    // Remove ID fields to prevent duplicate key errors on creation
    delete flightLogData._id;
    delete flightLogData.id;

    // Validate required fields
    if (!flightLogData.rpc || flightLogData.rpc.trim() === "") {
      console.log("Validation failed: Missing or empty rpc");
      return res.status(400).json({
        success: false,
        message: "Aircraft RPC is required",
      });
    }

    // Set status based on user role from frontend
    const userRole = flightLogData.createdBy;
    flightLogData.status =
      userRole === "pilot" ? "pending_release" : "pending_acceptance";

    // Handle component times - map componentTimes to componentData if needed
    if (flightLogData.componentTimes && !flightLogData.componentData) {
      console.log("Mapping componentTimes to componentData");
      flightLogData.componentData = {
        broughtForwardData: flightLogData.componentTimes.broughtForward || {},
        thisFlightData: flightLogData.componentTimes.thisFlight || {},
        toDateData: flightLogData.componentTimes.toDate || {},
      };
      delete flightLogData.componentTimes; // Remove the original to avoid confusion
    }

    // Initialize componentData if it doesn't exist
    if (!flightLogData.componentData) {
      flightLogData.componentData = {
        broughtForwardData: {},
        thisFlightData: {},
        toDateData: {},
      };
    }

    // Define all component fields
    const componentFields = [
      "airframe",
      "gearBoxMain",
      "gearBoxTail",
      "rotorMain",
      "rotorTail",
      "airframeNextInsp",
      "engine",
      "cycleN1",
      "cycleN2",
      "usage",
      "landingCycle",
      "engineNextInsp",
    ];

    // Ensure each section has all fields
    ["broughtForwardData", "thisFlightData", "toDateData"].forEach(
      (section) => {
        if (!flightLogData.componentData[section]) {
          flightLogData.componentData[section] = {};
        }
        // Initialize any missing fields with empty string
        componentFields.forEach((field) => {
          if (flightLogData.componentData[section][field] === undefined) {
            flightLogData.componentData[section][field] = "";
          }
        });
      },
    );

    console.log(
      "Processed componentData:",
      JSON.stringify(flightLogData.componentData, null, 2),
    );

    // Create and save the flight log
    const flightLog = new FlightLog(flightLogData);
    console.log("FlightLog model created");

    await flightLog.save();
    console.log("FlightLog saved successfully with ID:", flightLog._id);
    console.log(
      "Saved componentData:",
      JSON.stringify(flightLog.componentData, null, 2),
    );

    res.status(201).json({
      success: true,
      data: flightLog,
      message: "Flight log created successfully",
    });
  } catch (error) {
    console.error("=== ERROR CREATING FLIGHT LOG ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Check for duplicate key error
    if (error.code === 11000) {
      console.error("Duplicate key error");
      return res.status(400).json({
        success: false,
        message: "Duplicate entry - please try again",
      });
    }

    // Check for validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      console.error("Validation errors:", messages);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating flight log",
      error: error.message,
    });
  }
};

// @desc    Get all flight logs with pagination and filters
// @route   GET /api/flight-logs
// @access  Private
const getFlightLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      aircraftRPC,
      createdBy,
      startDate,
      endDate,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    console.log("Query params:", req.query);

    // Build filter object
    const filter = {};

    if (status) filter.status = status;
    if (aircraftRPC) filter.rpc = aircraftRPC;
    if (createdBy) filter.createdBy = createdBy;

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const flightLogs = await FlightLog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FlightLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: flightLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching flight logs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching flight logs",
      error: error.message,
    });
  }
};

// @desc    Get single flight log by ID
// @route   GET /api/flight-logs/:id
// @access  Private
const getFlightLogById = async (req, res) => {
  try {
    const flightLog = await FlightLog.findById(req.params.id);

    if (!flightLog) {
      return res.status(404).json({
        success: false,
        message: "Flight log not found",
      });
    }

    res.status(200).json({
      success: true,
      data: flightLog,
    });
  } catch (error) {
    console.error("Error fetching flight log:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching flight log",
      error: error.message,
    });
  }
};

// @desc    Get flight logs by aircraft RPC
// @route   GET /api/flight-logs/aircraft/:rpc
// @access  Private
const getFlightLogsByAircraft = async (req, res) => {
  try {
    const { rpc } = req.params;
    const { limit = 50 } = req.query;

    const flightLogs = await FlightLog.find({ rpc })
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: flightLogs.length,
      data: flightLogs,
    });
  } catch (error) {
    console.error("Error fetching aircraft flight logs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching aircraft flight logs",
      error: error.message,
    });
  }
};

// @desc    Update flight log
// @route   PUT /api/flight-logs/:id
// @access  Private
const updateFlightLog = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.id;
    delete updates.createdAt;
    delete updates.__v;

    // Update the flight log
    const flightLog = await FlightLog.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { returnDocument: "after", runValidators: true },
    );

    if (!flightLog) {
      return res.status(404).json({
        success: false,
        message: "Flight log not found",
      });
    }

    res.status(200).json({
      success: true,
      data: flightLog,
      message: "Flight log updated successfully",
    });
  } catch (error) {
    console.error("Error updating flight log:", error);
    res.status(500).json({
      success: false,
      message: "Error updating flight log",
      error: error.message,
    });
  }
};

// @desc    Release flight log (mechanic releases to pilot)
// @route   PUT /api/flight-logs/:id/release
// @access  Private (mechanic)
// Remove role checks from other functions or simplify them
const releaseFlightLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, signature } = req.body;

    const flightLog = await FlightLog.findById(id);

    if (!flightLog) {
      return res.status(404).json({
        success: false,
        message: "Flight log not found",
      });
    }

    // Check if flight log is in correct state
    if (flightLog.status !== "pending_release") {
      return res.status(400).json({
        success: false,
        message: `Cannot release flight log in ${flightLog.status} status`,
      });
    }

    // Release the flight log
    flightLog.release(name, signature);
    await flightLog.save();

    res.status(200).json({
      success: true,
      data: flightLog,
      message: "Flight log released successfully",
    });
  } catch (error) {
    console.error("Error releasing flight log:", error);
    res.status(500).json({
      success: false,
      message: "Error releasing flight log",
      error: error.message,
    });
  }
};

// @desc    Accept flight log (pilot accepts from mechanic)
// @route   PUT /api/flight-logs/:id/accept
// @access  Private (pilot)
const acceptFlightLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, signature, userRole } = req.body; // Get userRole from body

    // Check if user is authorized (Pilot)
    if (userRole !== "pilot") {
      return res.status(403).json({
        success: false,
        message: "Only pilots can accept flight logs",
      });
    }

    const flightLog = await FlightLog.findById(id);

    if (!flightLog) {
      return res.status(404).json({
        success: false,
        message: "Flight log not found",
      });
    }

    // Check if flight log is in correct state
    if (flightLog.status !== "pending_acceptance") {
      return res.status(400).json({
        success: false,
        message: `Cannot accept flight log in ${flightLog.status} status`,
      });
    }

    // Accept the flight log
    flightLog.accept(name, signature);
    await flightLog.save();

    res.status(200).json({
      success: true,
      data: flightLog,
      message: "Flight log accepted successfully",
    });
  } catch (error) {
    console.error("Error accepting flight log:", error);
    res.status(500).json({
      success: false,
      message: "Error accepting flight log",
      error: error.message,
    });
  }
};

// @desc    Complete flight log
// @route   PUT /api/flight-logs/:id/complete
// @access  Private
const completeFlightLog = async (req, res) => {
  try {
    const { id } = req.params;

    const flightLog = await FlightLog.findById(id);

    if (!flightLog) {
      return res.status(404).json({
        success: false,
        message: "Flight log not found",
      });
    }

    // Check if flight log is in correct state
    if (flightLog.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: `Cannot complete flight log in ${flightLog.status} status`,
      });
    }

    // Complete the flight log
    flightLog.complete();
    await flightLog.save();

    res.status(200).json({
      success: true,
      data: flightLog,
      message: "Flight log completed successfully",
    });
  } catch (error) {
    console.error("Error completing flight log:", error);
    res.status(500).json({
      success: false,
      message: "Error completing flight log",
      error: error.message,
    });
  }
};

// @desc    Get flight log statistics
// @route   GET /api/flight-logs/stats
// @access  Private
const getFlightLogStats = async (req, res) => {
  try {
    const stats = await FlightLog.aggregate([
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          pendingRelease: {
            $sum: { $cond: [{ $eq: ["$status", "pending_release"] }, 1, 0] },
          },
          pendingAcceptance: {
            $sum: { $cond: [{ $eq: ["$status", "pending_acceptance"] }, 1, 0] },
          },
          released: {
            $sum: { $cond: [{ $eq: ["$status", "released"] }, 1, 0] },
          },
          accepted: {
            $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalLogs: 1,
          pendingRelease: 1,
          pendingAcceptance: 1,
          released: 1,
          accepted: 1,
          completed: 1,
        },
      },
    ]);

    // Get logs by aircraft
    const aircraftStats = await FlightLog.aggregate([
      {
        $group: {
          _id: "$rpc",
          count: { $sum: 1 },
          lastFlight: { $max: "$date" },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall: stats[0] || {
          totalLogs: 0,
          pendingRelease: 0,
          pendingAcceptance: 0,
          released: 0,
          accepted: 0,
          completed: 0,
        },
        byAircraft: aircraftStats,
      },
    });
  } catch (error) {
    console.error("Error fetching flight log stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};

// @desc    Search flight logs
// @route   GET /api/flight-logs/search
// @access  Private
const searchFlightLogs = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const flightLogs = await FlightLog.find({
      $or: [
        { rpc: { $regex: q, $options: "i" } },
        { aircraftType: { $regex: q, $options: "i" } },
        { controlNo: { $regex: q, $options: "i" } },
        { remarks: { $regex: q, $options: "i" } },
        { "legs.stations.from": { $regex: q, $options: "i" } },
        { "legs.stations.to": { $regex: q, $options: "i" } },
      ],
    })
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: flightLogs.length,
      data: flightLogs,
    });
  } catch (error) {
    console.error("Error searching flight logs:", error);
    res.status(500).json({
      success: false,
      message: "Error searching flight logs",
      error: error.message,
    });
  }
};
