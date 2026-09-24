const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const mongoose = require("mongoose");
const FlightLog = require("../models/flightLogModel");
const PreInspection = require("../models/preInspectionModel");
const PostInspection = require("../models/postInspectionModel");
const { resolveFlightLogCrew, crewName } = require("../utils/flightLogCrew");
const { resolveAssignedPilot } = require("../utils/flightLogPilot");
const { resolvePreflightConfirmation } = require("../utils/flightLogPreflight");

const mechanicId = "000000000000000000000001";
const pilotId = "000000000000000000000002";
const confirmationId = "000000000000000000000003";
const signature = "data:image/png;base64,c2lnbmF0dXJl";

function creationHarness() {
  const directory = [
    { _id: mechanicId, firstName: "Actual", lastName: "Mechanic", jobTitle: "Mechanic", status: "active" },
    { _id: pilotId, firstName: "Actual", lastName: "Pilot", jobTitle: "Pilot", status: "active" },
  ];
  const select = (user) => ({ select: () => ({ lean: async () => user }) });
  const users = {
    findById: (id) => select(directory.find((user) => user._id === id)),
    findOne: (query) => select(directory.find((user) => Object.entries(query).every(([key, value]) => user[key] === value))),
  };
  const confirmation = {
    _id: confirmationId, userId: mechanicId, rpc: "RP-CTEST", flightLogId: null,
    expiresAt: new Date(Date.now() + 60_000), allGood: true, remarks: "",
    signer: { userId: mechanicId, name: "Actual Mechanic", signature },
  };
  const savedFlights = [];
  const state = { attempts: 0, ended: false, committed: null, notificationIds: [], auditCount: 0 };
  let writes;
  const session = {
    async withTransaction(callback) {
      // A transient commit failure rolls back the first transaction and reruns
      // its callback. Each attempt must construct fresh documents from the same
      // initial flight, without duplicating its history or confirmation use.
      for (let attempt = 0; attempt < 2; attempt++) {
        state.attempts++;
        writes = {};
        confirmation.flightLogId = null;
        await callback();
      }
      state.committed = writes;
    },
    async endSession() { state.ended = true; },
  };
  function StoredFlightLog(values) {
    const document = new FlightLog(values);
    document.save = async (options) => {
      assert.equal(options.session, session);
      await document.validate();
      savedFlights.push(document);
      writes.flight = document.toObject();
      return document;
    };
    return document;
  }
  StoredFlightLog.findOne = () => select(null);
  StoredFlightLog.findById = async (id) => String(id) === String(state.committed?.flight._id) ? state.committed.flight : null;
  function StoredPreInspection(values) {
    const document = new PreInspection(values);
    document.save = async (options) => {
      assert.equal(options.session, session);
      await document.validate();
      writes.pre = document.toObject();
      return document;
    };
    return document;
  }
  const dependencies = {
    mongoose: { isValidObjectId: mongoose.isValidObjectId, startSession: async () => session },
    "../models/userModel": users,
    "../models/flightLogModel": StoredFlightLog,
    "../models/preInspectionModel": StoredPreInspection,
    "../models/postInspectionModel": {
      async create(values, options) {
        assert.equal(options.session, session);
        assert.equal(values.length, 1);
        const document = new PostInspection(values[0]);
        await document.validate();
        writes.post = document.toObject();
        return [document];
      },
    },
    "../models/flightInspectionConfirmationModel": {
      findById: async (id) => id === confirmationId ? confirmation : null,
      async findOneAndUpdate(query, update, options) {
        assert.equal(options.session, session);
        assert.equal(String(query._id), confirmationId);
        assert.equal(query.flightLogId, null);
        if (confirmation.flightLogId) return null;
        confirmation.flightLogId = update.$set.flightLogId;
        return confirmation;
      },
    },
    "../utils/flightLogCrew": { crewName, resolveFlightLogCrew: (req, payload) => resolveFlightLogCrew(req, payload, null, users) },
    "../utils/flightLogPilot": { resolveAssignedPilot: (selected) => resolveAssignedPilot(selected, null, users) },
    "../utils/flightLogPreflight": { resolvePreflightConfirmation: (input, actorId) => resolvePreflightConfirmation(input, actorId, users) },
    "../utils/flightWorkflowNotificationOutbox": {
      pendingFlightNotification: require("../utils/flightWorkflowNotificationOutbox").pendingFlightNotification,
      async flushFlightNotifications(id) {
        assert.ok(state.committed, "Notifications must follow the committed transaction");
        state.notificationIds.push(String(id));
      },
    },
    "../utils/flightLogNotificationService": { createFlightLogNotifications: async () => {} },
    "./logsController": { auditLog: async () => { state.auditCount++; } },
  };
  const filename = path.join(__dirname, "../controllers/flightLogController.js");
  const localRequire = createRequire(filename);
  const loaded = { exports: {} };
  vm.compileFunction(fs.readFileSync(filename, "utf8"), ["require", "module", "exports", "console"], { filename })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : localRequire(name),
    loaded, loaded.exports, { log() {}, error() {} },
  );
  return {
    state, savedFlights, confirmation,
    async create(legacy) {
      const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
      await loaded.exports.createFlightLog({
        user: { id: mechanicId, jobTitle: "Mechanic" },
        body: {
          rpc: "RP-CTEST", aircraftType: "AS350B3e", date: "09/24/2026", confirmationId,
          assignedPilot: { userId: pilotId, name: "Forged pilot name" },
          legs: [{ totalTimeOff: "01:00", stations: [{ from: "Manila", to: "Local" }] }],
          ...(legacy ? { preFlightInspection: legacy } : {}),
        },
      }, response);
      return response;
    },
  };
}

test("flight creation retries atomically with ticket confirmation and optional legacy preflight evidence", async (t) => {
  for (const includeLegacy of [false, true]) {
    await t.test(includeLegacy ? "legacy evidence is preserved with the authenticated signer" : "the new confirmation flow does not require legacy evidence", async () => {
      const harness = creationHarness();
      const legacy = includeLegacy ? {
        status: "confirmed", signature, userId: pilotId, name: "Forged signer", recordedAt: "2000-01-01",
        remarks: " Old discrepancy ", resolution: " Resolved and reinspected ",
      } : undefined;
      const response = await harness.create(legacy);
      assert.equal(response.statusCode, 201, JSON.stringify(response.body));
      assert.equal(harness.state.attempts, 2);
      assert.equal(harness.state.ended, true);
      assert.equal(harness.savedFlights.length, 2);
      assert.notEqual(harness.savedFlights[0], harness.savedFlights[1]);
      assert.equal(String(harness.savedFlights[0]._id), String(harness.savedFlights[1]._id));
      const { flight, pre, post } = harness.state.committed;
      assert.equal(flight.workflowHistory.length, 1);
      assert.equal(flight.workflowHistory[0].action, "created");
      assert.equal(flight.assignedPilot.name, "Actual Pilot");
      assert.equal(String(flight.assignedMechanic.userId), mechanicId);
      assert.equal(String(pre.flightLogId), String(flight._id));
      assert.equal(pre.status, "released");
      assert.equal(pre.confirmation.allGood, true);
      assert.equal(pre.releasedBy.signature, signature);
      assert.equal(String(post.flightLogId), String(flight._id));
      assert.equal(String(post.preInspectionId), String(pre._id));
      assert.equal(String(harness.confirmation.flightLogId), String(flight._id));
      assert.deepEqual(harness.state.notificationIds, [String(flight._id)]);
      assert.equal(response.body.data.pendingNotifications, undefined);
      if (includeLegacy) {
        assert.equal(flight.preFlightInspection.signature, signature);
        assert.equal(String(flight.preFlightInspection.userId), mechanicId);
        assert.equal(flight.preFlightInspection.name, "Actual Mechanic");
        assert.equal(flight.preFlightInspection.remarks, "Old discrepancy");
        assert.equal(flight.preFlightInspection.resolution, "Resolved and reinspected");
        assert.ok(flight.preFlightInspection.recordedAt > new Date("2000-01-01"));
      } else {
        assert.equal(flight.preFlightInspection, undefined);
      }
      const replay = await harness.create(legacy);
      assert.equal(replay.statusCode, 200);
      assert.equal(replay.body.replayed, true);
      assert.equal(String(replay.body.data._id), String(flight._id));
      assert.equal(harness.state.attempts, 2);
      assert.equal(harness.state.auditCount, 1);
      assert.equal(harness.state.notificationIds.length, 1);
    });
  }
});
