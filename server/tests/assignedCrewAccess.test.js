const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const { isAssignedFlightCrew } = require("../../shared/flightCrewAccess");
const inspectionCrew = require("../utils/inspectionFlightCrew");
const FlightLog = require("../models/flightLogModel");
const PreInspection = require("../models/preInspectionModel");
const PostInspection = require("../models/postInspectionModel");

const pilotId = "000000000000000000000001";
const mechanicId = "000000000000000000000002";
const otherId = "000000000000000000000003";
const flightId = "000000000000000000000004";
const inspectionId = "000000000000000000000005";
const pilot = { id: pilotId, jobTitle: "Pilot" };
const mechanic = { id: mechanicId, jobTitle: "Mechanic" };
const newLog = (values = {}) => new FlightLog({
  _id: flightId, rpc: "RP-C1234", aircraftType: "AS350B3", status: "pending_release",
  assignedPilot: { userId: pilotId, name: "Assigned Pilot" },
  assignedMechanic: { userId: mechanicId, name: "Assigned Mechanic" }, ...values,
});

const loadController = (filename, stubs) => {
  const filenamePath = path.join(__dirname, "../controllers", filename);
  const localRequire = createRequire(filenamePath);
  const result = { exports: {} };
  vm.compileFunction(fs.readFileSync(filenamePath, "utf8"), ["require", "module", "exports"], { filename: filenamePath })(
    (name) => Object.hasOwn(stubs, name) ? stubs[name] : localRequire(name), result, result.exports,
  );
  return result.exports;
};
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } });

test("crew membership uses authenticated identity and matching crew role without admin override", () => {
  const log = newLog();
  assert.equal(isAssignedFlightCrew(pilot, log), true);
  assert.equal(isAssignedFlightCrew(mechanic, log), true);
  for (const user of [null, { id: otherId, jobTitle: "Mechanic" }, { id: mechanicId, jobTitle: "Pilot" }, { id: mechanicId, jobTitle: "Superadmin" }, { id: otherId, jobTitle: "Superadmin" }]) {
    assert.equal(isAssignedFlightCrew(user, log), false);
  }
  assert.equal(isAssignedFlightCrew(mechanic, { createdByUserId: mechanicId }), false);
});

const flightHarness = (values = {}) => {
  const log = newLog(values);
  const writes = [];
  const notifications = [];
  log.save = async () => { writes.push("save"); return log; };
  const controller = loadController("flightLogController.js", {
    "../models/flightLogModel": {
      findById: async () => log,
      findByIdAndUpdate: async (_id, update) => { writes.push(update); return newLog({ ...log.toObject(), ...update }); },
    },
    "../utils/flightLogNotificationService": { createFlightLogNotifications: async (value) => notifications.push(value) },
    "./logsController": { auditLog: async () => {} },
  });
  return { controller, writes, notifications };
};

test("flight-log save, release, accept and completion deny unassigned users before any write or notification", async () => {
  for (const action of ["updateFlightLog", "releaseFlightLog", "acceptFlightLog", "completeFlightLog"]) {
    for (const role of ["Mechanic", "Pilot", "Superadmin"]) {
      const { controller, writes, notifications } = flightHarness();
      const res = response();
      await controller[action]({ user: { id: otherId, jobTitle: role }, params: { id: flightId }, body: { assignedMechanic: { userId: otherId }, assignedPilot: { userId: otherId }, remarks: "Hijack" } }, res);
      assert.equal(res.statusCode, 403, `${action}: ${role}`);
      assert.deepEqual(writes, []);
      assert.deepEqual(notifications, []);
    }
  }
});

test("assigned crew retain flight-log saves and role-appropriate workflow actions", async () => {
  for (const [action, user, state] of [
    ["updateFlightLog", mechanic, {}], ["updateFlightLog", pilot, {}],
    ["releaseFlightLog", mechanic, {}],
    ["acceptFlightLog", pilot, { status: "pending_acceptance", releasedBy: { name: "Mechanic", signature: "signed" } }],
    ["completeFlightLog", mechanic, { status: "accepted" }],
  ]) {
    const { controller, writes } = flightHarness(state);
    const res = response();
    await controller[action]({ user, params: { id: flightId }, body: { remarks: "Updated", name: "Crew", signature: "signed" } }, res);
    assert.equal(res.statusCode, 200, `${action}: ${JSON.stringify(res.body)}`);
    assert.equal(writes.length, 1);
  }
});

const inspectionHarness = (kind, linkedLog = newLog(), values = {}) => {
  const Model = kind === "pre" ? PreInspection : PostInspection;
  const inspection = new Model({ _id: inspectionId, flightLogId: flightId, rpc: "RP-C1234", aircraftType: "AS350B3", date: "09/20/2026", status: "pending", ...values });
  const writes = [];
  const notifications = [];
  const stubModel = {
    schema: Model.schema,
    findById: async () => inspection,
    create: async (value) => { writes.push(value); return new Model(value); },
    findByIdAndUpdate: async (_id, update) => { writes.push(update); return new Model({ ...inspection.toObject(), ...(update.$set || update) }); },
    findByIdAndDelete: async () => { writes.push("delete"); return inspection; },
  };
  const controller = loadController(`${kind}InspectionController.js`, {
    [`../models/${kind}InspectionModel`]: stubModel,
    ...(kind === "pre" ? { "../models/postInspectionModel": { create: async (value) => { writes.push(value); return value; } } } : {}),
    "../utils/inspectionFlightCrew": {
      ...inspectionCrew,
      getInspectionFlightLog: async (record) => String(record.flightLogId) === flightId ? linkedLog : null,
    },
    [`../utils/${kind}InspectionNotificationService`]: { [kind === "pre" ? "createPreInspectionNotifications" : "createPostInspectionNotifications"]: async (value) => notifications.push(value) },
    "./logsController": { auditLog: async () => {} },
  });
  return { controller, writes, notifications };
};

test("inspection updates and deletes use the persisted link and deny unassigned users", async () => {
  for (const kind of ["pre", "post"]) {
    for (const action of ["update", "delete"]) {
      for (const jobTitle of ["Pilot", "Mechanic", "Superadmin"]) {
        const { controller, writes, notifications } = inspectionHarness(kind);
        const res = response();
        await controller[`${action}${kind === "pre" ? "Pre" : "Post"}Inspection`]({ user: { id: otherId, jobTitle }, params: { id: inspectionId }, body: { flightLogId: otherId, assignedMechanic: { userId: otherId }, status: "completed" } }, res);
        assert.equal(res.statusCode, 403);
        assert.deepEqual(writes, []);
        assert.deepEqual(notifications, []);
      }
    }
  }
});

test("assigned crew can save inspections but cannot replace links or crew through a save", async () => {
  for (const kind of ["pre", "post"]) {
    for (const user of [pilot, mechanic]) {
      const { controller, writes } = inspectionHarness(kind);
      const res = response();
      await controller[`update${kind === "pre" ? "Pre" : "Post"}Inspection`]({ user, params: { id: inspectionId }, body: { base: "NEW BASE", flightLogId: otherId, rpc: "FAKE", assignedPilot: { userId: otherId }, $set: { flightLogId: otherId }, "assignedMechanic.userId": otherId } }, res);
      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
      const update = writes[0].$set || writes[0];
      assert.deepEqual(update, { base: "NEW BASE" });
      assert.equal(res.body.data.assignedPilot.name, "Assigned Pilot");
    }
  }
});

test("crew reassignment on the linked Flight Log immediately changes inspection access", async () => {
  const linkedLog = newLog({ assignedMechanic: { userId: otherId, name: "Replacement" } });
  for (const kind of ["pre", "post"]) {
    for (const [user, expected] of [[mechanic, 403], [{ id: otherId, jobTitle: "Mechanic" }, 200]]) {
      const { controller } = inspectionHarness(kind, linkedLog);
      const res = response();
      await controller[`update${kind === "pre" ? "Pre" : "Post"}Inspection`]({ user, params: { id: inspectionId }, body: { base: "NEW" } }, res);
      assert.equal(res.statusCode, expected);
    }
  }
});

test("new Pre-Flight and its generated Post-Flight keep the same specific Flight Log link", async () => {
  const { controller, writes, notifications } = inspectionHarness("pre");
  const res = response();
  await controller.createPreInspection({ user: mechanic, body: { flightLogId: flightId, rpc: "FORGED", aircraftType: "FORGED", date: "09/20/2026" } }, res);
  assert.equal(res.statusCode, 201, JSON.stringify(res.body));
  assert.equal(writes.length, 2);
  for (const value of writes) {
    assert.equal(String(value.flightLogId), flightId);
    assert.equal(value.rpc, "RP-C1234");
  }
  assert.equal(notifications[0].inspection.assignedPilot.name, "Assigned Pilot");
});

test("unlinked and completed inspections remain read-only", async () => {
  for (const kind of ["pre", "post"]) {
    for (const [linkedLog, values, expected] of [[null, {}, 403], [newLog(), { status: "completed" }, 400]]) {
      const { controller, writes } = inspectionHarness(kind, linkedLog, values);
      const res = response();
      await controller[`update${kind === "pre" ? "Pre" : "Post"}Inspection`]({ user: mechanic, params: { id: inspectionId }, body: {} }, res);
      assert.equal(res.statusCode, expected);
      assert.deepEqual(writes, []);
    }
  }
});
