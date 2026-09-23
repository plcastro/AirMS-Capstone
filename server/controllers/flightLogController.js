const FlightLog = require("../models/flightLogModel");
const { resolveAssignedPilot } = require("../utils/flightLogPilot");
const {
  applyFlightLogHours,
  requiredFlightTimeError,
} = require("../../shared/flightLogTimes");
const { syncFlightLogDates } = require("../../shared/flightLogDates");
const { auditLog } = require("./logsController");
const {
  createFlightLogNotifications,
} = require("../utils/flightLogNotificationService");
const {
  canEditFlightLogRequest,
  getTrustedFlightLogRole,
  hasCompleteFlightLogLegs,
  isB412AircraftType,
  isMechanicFlightLogRequest,
  isPilotFlightLogRequest,
  isRestrictedPilotFlightLogRequest,
  mergePilotB412Update,
  pickFlightLogPayloadForRequest,
} = require("../utils/flightLogPayload");
const getAuditActorId = (req, fallbackId = null) => req.user?.id || fallbackId;
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
};

const toComparableFlightLog = (flightLog) => {
  if (!flightLog) {
    return null;
  }

  return typeof flightLog.toObject === "function"
    ? flightLog.toObject()
    : flightLog;
};

const isReleasedFlightLogStatus = (status = "") =>
  ["pending_acceptance", "released", "accepted", "completed"].includes(
    String(status || "")
      .trim()
      .toLowerCase(),
  );

const ONGOING_FLIGHT_LOG_STATUSES = [
  "pending_release",
  "pending_acceptance",
  "released",
  "accepted",
  "ongoing",
  "draft",
  "submitted",
  "returned_to_mechanic",
  "returned_to_pilot",
];

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeAircraftRpc = (value = "") => String(value || "").trim();

const findOngoingFlightLogForAircraft = async (rpc, excludedId = null) => {
  const normalizedRpc = normalizeAircraftRpc(rpc);

  if (!normalizedRpc) {
    return null;
  }

  const query = {
    rpc: { $regex: `^${escapeRegex(normalizedRpc)}$`, $options: "i" },
    status: { $in: ONGOING_FLIGHT_LOG_STATUSES },
  };

  if (excludedId) {
    query._id = { $ne: excludedId };
  }

  return FlightLog.findOne(query)
    .select("_id rpc status controlNo date")
    .lean();
};

const normalizeFlightLogStatusFilter = (status = "") => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "all" || normalized === "all_status") {
    return [];
  }

  if (normalized === "pending_release") {
    return ["pending_release", "ongoing", "draft"];
  }
  if (normalized === "pending_acceptance") {
    return ["pending_acceptance", "released"];
  }

  return normalized ? [normalized] : [];
};

const hasDestinationInfo = (flightLog = {}) =>
  Array.isArray(flightLog.legs) &&
  flightLog.legs.some(
    (leg) =>
      Array.isArray(leg?.stations) &&
      leg.stations.some(
        (station) =>
          String(station?.from || "").trim() &&
          String(station?.to || "").trim(),
      ),
  );

const getB412PayloadShapeError = (b412Data) => {
  if (b412Data === undefined || b412Data === null) {
    return null;
  }

  if (typeof b412Data !== "object" || Array.isArray(b412Data)) {
    return "b412Data must be an object";
  }

  const arrayLimits = [
    ["passengerRows", 4],
    ["fuelServicing", 6],
    ["oilServicing", 2],
    ["correctionItems", 3],
  ];

  for (const [field, maximum] of arrayLimits) {
    const value = b412Data[field];
    if (value !== undefined && !Array.isArray(value)) {
      return `b412Data.${field} must be an array`;
    }
    if (Array.isArray(value) && value.length > maximum) {
      return `b412Data.${field} cannot contain more than ${maximum} rows`;
    }
  }

  for (const [rowIndex, row] of (b412Data.passengerRows || []).entries()) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return `b412Data.passengerRows[${rowIndex}] must be an object`;
    }
    if (row.legs !== undefined && !Array.isArray(row.legs)) {
      return `b412Data.passengerRows[${rowIndex}].legs must be an array`;
    }
    if (Array.isArray(row.legs) && row.legs.length > 6) {
      return `b412Data.passengerRows[${rowIndex}].legs cannot contain more than 6 entries`;
    }
  }

  return null;
};

// @desc    Create a new flight log
// @route   POST /api/flight-logs
// @access  Private (pilot or mechanic)
const createFlightLog = async (req, res) => {
  try {
    if (getTrustedFlightLogRole(req) !== "mechanic") {
      return res.status(403).json({
        success: false,
        message: "Your role has read-only access to flight logs",
      });
    }

    console.log("=== CREATE FLIGHT LOG CALLED ===");

    const flightLogData = pickFlightLogPayloadForRequest(
      req,
      req.body,
      "create",
    );

    Object.assign(flightLogData, syncFlightLogDates(flightLogData));
    const timeError = requiredFlightTimeError(flightLogData.legs);
    if (timeError)
      return res.status(400).json({ success: false, message: timeError });

    const b412PayloadError = getB412PayloadShapeError(flightLogData.b412Data);
    if (b412PayloadError) {
      return res.status(400).json({
        success: false,
        message: b412PayloadError,
      });
    }

    // Validate required fields
    flightLogData.rpc = normalizeAircraftRpc(flightLogData.rpc);

    if (!flightLogData.rpc) {
      console.log("Validation failed: Missing or empty rpc");
      return res.status(400).json({
        success: false,
        message: "Aircraft RPC is required",
      });
    }

    const confirmation = mongoose.isValidObjectId(req.body.confirmationId)
      ? await EntryConfirmation.findById(req.body.confirmationId)
      : null;
    if (
      !confirmation ||
      String(confirmation.userId) !== String(req.user.id) ||
      confirmation.rpc !== flightLogData.rpc
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Complete the Pre-Flight confirmation for this aircraft before creating the flight log.",
        });
    }
    if (confirmation.flightLogId) {
      const existing = await FlightLog.findById(confirmation.flightLogId);
      if (existing)
        return res
          .status(200)
          .json({ success: true, data: existing, replayed: true });
    }
    if (confirmation.expiresAt <= new Date())
      return res
        .status(409)
        .json({
          success: false,
          message:
            "The Pre-Flight confirmation expired. Start a new entry and confirm again.",
        });
    const existingOngoingFlightLog = await findOngoingFlightLogForAircraft(
      flightLogData.rpc,
    );

    if (existingOngoingFlightLog) {
      return res.status(409).json({
        success: false,
        message: `Aircraft ${flightLogData.rpc} already has an ongoing flight log. Complete the existing flight log before creating a new entry.`,
        existingFlightLog: existingOngoingFlightLog,
      });
    }

    if (isRestrictedPilotFlightLogRequest(req)) {
      flightLogData.createdBy = getTrustedFlightLogRole(req);
      if (req.user?.id) {
        flightLogData.createdByUserId = req.user.id;
      }
    }

    // New records always start unsigned, even when old clients send a status.
    flightLogData.status = "pending_release";
    flightLogData.notifiedForCompletion = false;
    delete flightLogData.releasedBy;
    delete flightLogData.acceptedBy;
    flightLogData.createdBy = getTrustedFlightLogRole(req);
    flightLogData.createdByUserId = req.user.id;
    if (!flightLogData.controlNo)
      flightLogData.controlNo = "FL-" + Date.now().toString(36).toUpperCase();

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

    const crew = await resolveFlightLogCrew(req, flightLogData);
    if (crew.error)
      return res.status(400).json({ success: false, message: crew.error });
    delete flightLogData.assignedPilot;
    delete flightLogData.assignedMechanic;
    Object.assign(flightLogData, crew.assignments);

    // Create and save the flight log
    if (Object.hasOwn(flightLogData, "assignedPilot")) {
      const pilot = await resolveAssignedPilot(flightLogData.assignedPilot);
      if (pilot.error)
        return res.status(400).json({ success: false, message: pilot.error });
      flightLogData.assignedPilot = pilot.value;
    }
    const flightLog = new FlightLog(applyFlightLogHours(flightLogData));
    console.log("FlightLog model created");

    const { eventFor } = require("../utils/flightWorkflowRules");
    const {
      pendingFlightNotification,
      flushFlightNotifications,
    } = require("../utils/flightWorkflowNotificationOutbox");
    const created = eventFor(flightLog, "created", req.user, {
      rpc: flightLog.rpc,
      assignedPilot: flightLog.assignedPilot,
      assignedMechanic: flightLog.assignedMechanic,
    });
    created.version = 0;
    flightLog.workflowHistory.push(created);
    const notification = pendingFlightNotification(flightLog, -1);
    if (notification) flightLog.pendingNotifications.push(notification);
    const initial = flightLog.toObject();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        flightLog = new FlightLog(initial);
        const consumed = await EntryConfirmation.findOneAndUpdate(
          { _id: confirmation._id, flightLogId: null },
          { $set: { flightLogId: flightLog._id } },
          { session },
        );
        if (!consumed)
          throw Object.assign(
            new Error(
              "This confirmation was already used. Reload your flight records.",
            ),
            { status: 409 },
          );
        await flightLog.save({ session });
        const pre = new PreInspection({
          flightLogId: flightLog._id,
          rpc: flightLog.rpc,
          aircraftType: flightLog.aircraftType,
          date: flightLog.date,
          createdBy: req.user.id,
        });
        confirmInspection(
          pre,
          "pre",
          confirmation.allGood,
          confirmation.remarks,
          confirmation.signer,
          req.user,
        );
        await pre.save({ session });
        await PostInspection.create(
          [
            {
              flightLogId: flightLog._id,
              preInspectionId: pre._id,
              linkedFromPreFlight: true,
              rpc: flightLog.rpc,
              aircraftType: flightLog.aircraftType,
              date: flightLog.date,
              createdBy: req.user.id,
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    try {
      await flushFlightNotifications(flightLog._id);
    } catch {
      /* Delivery remains queued without failing the saved draft. */
    }
    const audit = withActorId(req, `Flight log created: ${flightLog._id}`);
    await auditLog(audit.action, audit.actorId).catch(() => {});
    console.log("FlightLog saved successfully with ID:", flightLog._id);
    console.log(
      "Saved componentData:",
      JSON.stringify(flightLog.componentData, null, 2),
    );

    const responseData = flightLog.toObject();
    delete responseData.pendingNotifications;
    res.status(201).json({
      success: true,
      data: responseData,
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

    // console.log("Query params:", req.query);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 500);
    const allowedSortFields = new Set([
      "date",
      "createdAt",
      "updatedAt",
      "status",
      "rpc",
      "aircraftType",
      "controlNo",
    ]);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "date";
    const safeSortOrder = sortOrder === "asc" ? 1 : -1;

    // Build filter object
    const filter = {};

    if (typeof status === "string" && status.trim()) {
      const statuses = normalizeFlightLogStatusFilter(status);
      if (statuses.length === 1) {
        filter.status = statuses[0];
      } else if (statuses.length > 1) {
        filter.status = { $in: statuses };
      }
    }
    if (typeof aircraftRPC === "string" && aircraftRPC.trim())
      filter.rpc = aircraftRPC.trim();
    if (typeof createdBy === "string" && createdBy.trim())
      filter.createdBy = createdBy.trim();

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const parsedStartDate = new Date(startDate);
        if (!Number.isNaN(parsedStartDate.getTime())) {
          filter.date.$gte = parsedStartDate.toISOString();
        }
      }
      if (endDate) {
        const parsedEndDate = new Date(endDate);
        if (!Number.isNaN(parsedEndDate.getTime())) {
          filter.date.$lte = parsedEndDate.toISOString();
        }
      }
      if (Object.keys(filter.date).length === 0) {
        delete filter.date;
      }
    }

    // Pagination
    const skip = (safePage - 1) * safeLimit;

    // Sort
    const sort = { [safeSortBy]: safeSortOrder };

    const flightLogs = await FlightLog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(safeLimit)
      .lean();

    const total = await FlightLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: flightLogs,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    console.error("Error fetching flight logs:", {
      message: error.message,
      name: error.name,
      query: req.query,
      stack: error.stack,
    });
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
    const audit = withActorId(req, `Flight log updated: ${flightLog._id}`);
    await auditLog(audit.action, audit.actorId);

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
    if (!canEditFlightLogRequest(req)) {
      return res.status(403).json({
        success: false,
        message: "Your role has read-only access to flight logs",
      });
    }

    const { id } = req.params;
    const updates = pickFlightLogPayloadForRequest(req, req.body, "update");

    const b412PayloadError = getB412PayloadShapeError(updates.b412Data);
    if (b412PayloadError) {
      return res.status(400).json({
        success: false,
        message: b412PayloadError,
      });
    }
    const existingFlightLog = await FlightLog.findById(id);

    if (!existingFlightLog) {
      return res.status(404).json({
        success: false,
        message: "Flight log not found",
      });
    }

    if (existingFlightLog.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed flight logs cannot be edited",
      });
    }

    if (
      ["date", "legs", "fuelServicing", "oilServicing"].some((key) =>
        Object.hasOwn(updates, key),
      )
    ) {
      const dated = syncFlightLogDates({
        ...toComparableFlightLog(existingFlightLog),
        ...updates,
      });
      for (const key of ["legs", "fuelServicing", "oilServicing"])
        updates[key] = dated[key];
    }
    const timeError = requiredFlightTimeError(
      Object.hasOwn(updates, "legs") ? updates.legs : existingFlightLog.legs,
    );
    if (timeError)
      return res.status(400).json({ success: false, message: timeError });

    if (
      isRestrictedPilotFlightLogRequest(req) &&
      Object.prototype.hasOwnProperty.call(updates, "legs") &&
      !hasCompleteFlightLogLegs(updates.legs)
    ) {
      return res.status(400).json({
        success: false,
        message: "Each leg must include complete station route and date",
      });
    }

    if (
      isRestrictedPilotFlightLogRequest(req) &&
      Object.prototype.hasOwnProperty.call(updates, "b412Data")
    ) {
      if (isB412AircraftType(existingFlightLog.aircraftType)) {
        updates.b412Data = mergePilotB412Update(
          existingFlightLog.b412Data,
          updates.b412Data,
        );
      } else {
        delete updates.b412Data;
      }
    }

    if (isReleasedFlightLogStatus(existingFlightLog.status)) {
      delete updates.rpc;
    }

    if (
      updates.rpc &&
      normalizeAircraftRpc(updates.rpc).toLowerCase() !==
        normalizeAircraftRpc(existingFlightLog.rpc).toLowerCase()
    ) {
      updates.rpc = normalizeAircraftRpc(updates.rpc);
      const existingOngoingFlightLog = await findOngoingFlightLogForAircraft(
        updates.rpc,
        id,
      );

      if (existingOngoingFlightLog) {
        return res.status(409).json({
          success: false,
          message: `Aircraft ${updates.rpc} already has an ongoing flight log. Complete the existing flight log before using this aircraft.`,
          existingFlightLog: existingOngoingFlightLog,
        });
      }
    }

    if (
      updates.notifiedForCompletion === true &&
      existingFlightLog.notifiedForCompletion !== true
    ) {
      const nextFlightLog = {
        ...toComparableFlightLog(existingFlightLog),
        ...updates,
      };

      if (!hasDestinationInfo(nextFlightLog)) {
        return res.status(400).json({
          success: false,
          message:
            "Add at least one complete From-To station in Destination/s before notifying for completion.",
        });
      }
    }

    if (
      [
        "date",
        "legs",
        "fuelServicing",
        "oilServicing",
        "componentData",
        "additionalLandings",
      ].some((key) => Object.hasOwn(updates, key))
    ) {
      const calculated = applyFlightLogHours({
        ...toComparableFlightLog(existingFlightLog),
        ...updates,
      });
      updates.componentData = calculated.componentData;
      updates.additionalLandings = calculated.additionalLandings;
      updates.legs = calculated.legs;
      updates.fuelServicing = calculated.fuelServicing;
      updates.oilServicing = calculated.oilServicing;
    }

    if (Object.hasOwn(updates, "assignedPilot")) {
      const pilot = await resolveAssignedPilot(
        updates.assignedPilot,
        existingFlightLog.assignedPilot,
      );
      if (pilot.error)
        return res.status(400).json({ success: false, message: pilot.error });
      updates.assignedPilot = pilot.value;
    }

    // Update the flight log
    const flightLog = await FlightLog.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { returnDocument: "after", runValidators: true },
    );

    await createFlightLogNotifications({
      previousFlightLog: toComparableFlightLog(existingFlightLog),
      flightLog,
      actorUserId: req.user?.id,
    });

    res.status(200).json({
      success: true,
      data: flightLog,
      message: "Flight log updated successfully",
    });
  } catch (error) {
    console.error("Error updating flight log:", error);

    if (error.name === "ValidationError" || error.name === "CastError") {
      const errors = error.errors
        ? Object.values(error.errors).map((entry) => entry.message)
        : [error.message];
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

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
const releaseFlightLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, signature } = req.body;

    if (!isMechanicFlightLogRequest(req)) {
      return res.status(403).json({
        success: false,
        message: "Only mechanics can release flight logs",
      });
    }

    const flightLog = await FlightLog.findById(id);

    if (!flightLog) {
      return res.status(404).json({
        success: false,
        message: "Flight log not found",
      });
    }

    if (!isAssignedFlightCrew(req.user, flightLog)) {
      return res
        .status(403)
        .json({ success: false, message: CREW_ACCESS_MESSAGE });
    }

    // Check if flight log is in correct state
    if (flightLog.status !== "pending_release") {
      return res.status(400).json({
        success: false,
        message: `Cannot release flight log in ${flightLog.status} status`,
      });
    }

    const timeError = requiredFlightTimeError(flightLog.legs);
    if (timeError)
      return res.status(400).json({ success: false, message: timeError });

    // Release the flight log
    const previousFlightLog = toComparableFlightLog(flightLog);
    flightLog.release(name, signature);
    await flightLog.save();
    await createFlightLogNotifications({
      previousFlightLog,
      flightLog,
      actorUserId: req.user?.id,
    });
    const audit = withActorId(req, `Flight log released: ${flightLog._id}`);
    await auditLog(audit.action, audit.actorId);

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
    const { name, signature } = req.body;

    // Authorization is derived from the verified token, never request data.
    if (!isPilotFlightLogRequest(req)) {
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

    if (!isAssignedFlightCrew(req.user, flightLog)) {
      return res
        .status(403)
        .json({ success: false, message: CREW_ACCESS_MESSAGE });
    }

    // Check if flight log is in correct state
    if (!["pending_acceptance", "released"].includes(flightLog.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept flight log in ${flightLog.status} status`,
      });
    }

    if (!flightLog.releasedBy?.signature && !flightLog.releasedBy?.name) {
      return res.status(400).json({
        success: false,
        message: "Flight log must be released by a mechanic before acceptance",
      });
    }

    // Accept the flight log
    const previousFlightLog = toComparableFlightLog(flightLog);
    flightLog.accept(name, signature);
    await flightLog.save();
    await createFlightLogNotifications({
      previousFlightLog,
      flightLog,
      actorUserId: req.user?.id,
    });
    const audit = withActorId(req, `Flight log accepted: ${flightLog._id}`);
    await auditLog(audit.action, audit.actorId);

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
// @access  Private (mechanic)
const completeFlightLog = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isMechanicFlightLogRequest(req)) {
      return res.status(403).json({
        success: false,
        message: "Only mechanics can complete flight logs",
      });
    }

    const flightLog = await FlightLog.findById(id);

    if (!flightLog) {
      return res.status(404).json({
        success: false,
        message: "Flight log not found",
      });
    }

    if (!isAssignedFlightCrew(req.user, flightLog)) {
      return res
        .status(403)
        .json({ success: false, message: CREW_ACCESS_MESSAGE });
    }

    // Check if flight log is in correct state
    if (flightLog.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: `Cannot complete flight log in ${flightLog.status} status`,
      });
    }

    const timeError = requiredFlightTimeError(flightLog.legs);
    if (timeError)
      return res.status(400).json({ success: false, message: timeError });

    // Complete the flight log
    const previousFlightLog = toComparableFlightLog(flightLog);
    flightLog.complete();
    await flightLog.save();
    await createFlightLogNotifications({
      previousFlightLog,
      flightLog,
      actorUserId: req.user?.id,
    });
    const audit = withActorId(req, `Flight log completed: ${flightLog._id}`);
    await auditLog(audit.action, audit.actorId);

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
        { "b412Data.serialNumber": { $regex: q, $options: "i" } },
        { "b412Data.discrepancyRemarks": { $regex: q, $options: "i" } },
        { "b412Data.correctionItems.category": { $regex: q, $options: "i" } },
        { "b412Data.correctionItems.workDone": { $regex: q, $options: "i" } },
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

const getFlightLogCrewOptions = async (req, res) => {
  if (!canEditFlightLogRequest(req)) {
    return res
      .status(403)
      .json({ success: false, message: "Your role cannot assign flight crew" });
  }
  try {
    const users = await User.find({
      status: "active",
      jobTitle: { $in: ["Pilot", "Mechanic"] },
    })
      .select("firstName lastName jobTitle")
      .sort({ lastName: 1, firstName: 1 })
      .lean();
    return res.json({
      success: true,
      data: users.map((user) => ({
        userId: String(user._id),
        name: crewName(user),
        role: user.jobTitle,
      })),
    });
  } catch (error) {
    if (error.status)
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    if (
      /Transaction numbers are only allowed|replica set|does not support retryable writes/i.test(
        error.message || "",
      )
    )
      return res
        .status(503)
        .json({
          success: false,
          message:
            "Creating a flight and its inspections requires MongoDB Atlas or a replica set. No partial records were saved.",
        });
    console.error("Error loading flight crew:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load flight crew" });
  }
};

module.exports = {
  getFlightLogCrewOptions,
  createFlightLog,
  getFlightLogs,
  getFlightLogById,
  getFlightLogsByAircraft,
  updateFlightLog,
  releaseFlightLog,
  acceptFlightLog,
  completeFlightLog,
  getFlightLogStats,
  searchFlightLogs,
};
