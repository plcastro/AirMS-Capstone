const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const { createRequire } = require("node:module");
const { inspectionIdentity } = require("../utils/maintenancePriorityOverride");

const makePart = (id = "row-150", remaining = "1") => ({
  _id: id, componentName: "150 FH Inspection", rowType: "part", hourLimit1: "150",
  hoursCW: "100", dateCW: "2026-01-01", dateDue: "", ttCycleDue: "250", timeRemaining: remaining,
});
const makeRecord = (aircraft = "RP-C1001", remaining = "1") => ({
  _id: aircraft, aircraft, aircraftType: "AS350 B2", lastUpdated: new Date("2026-01-01"),
  referenceData: { acftTT: 249 }, parts: [makePart("row-150", remaining)],
});

function load(filename, dependencies) {
  const full = path.join(__dirname, filename);
  const localRequire = createRequire(full);
  const module = { exports: {} };
  vm.compileFunction(fs.readFileSync(full, "utf8"), ["require", "module", "exports"], { filename: full })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : localRequire(name), module, module.exports,
  );
  return module.exports;
}

function harness(initial = [makeRecord()]) {
  const records = structuredClone(initial);
  const schedules = [{ aircraftModel: "AS350 B2", inspectionName: "150 FH Inspection", interval: { flightHours: 150 } }];
  const state = { records, schedules, writes: 0, events: [], beforeCleanup: null, conflict: false };
  const model = {
    find: () => ({ sort: async () => structuredClone(records) }),
    findOne: async (query) => structuredClone(records.find((r) => query.aircraft.test(r.aircraft)) || null),
    findOneAndUpdate: async (query, update) => {
      const record = records.find((r) => r._id === query._id && String(r.lastUpdated) === String(query.lastUpdated));
      if (!record || state.conflict) return null;
      if (update.$set) Object.assign(record, structuredClone(update.$set));
      if (update.$unset) delete record.manualPriorityOverride;
      state.writes += 1;
      return structuredClone(record);
    },
    bulkWrite: async (operations) => {
      state.beforeCleanup?.();
      for (const { updateOne: { filter } } of operations) {
        const record = records.find((r) => r._id === filter._id);
        if (record?.manualPriorityOverride?.appliesToInspectionId === filter["manualPriorityOverride.appliesToInspectionId"] &&
            String(record.manualPriorityOverride.setAt) === String(filter["manualPriorityOverride.setAt"])) {
          delete record.manualPriorityOverride;
        }
      }
    },
  };
  const controller = load("../controllers/partsMonitoringController.js", {
    "../models/partsMonitoringModel": model,
    "../models/inspectionScheduleModel": { find: () => ({ sort: async () => schedules }) },
    "../models/inspectionTaskModel": { find: () => ({ sort: async () => [] }) },
    "../models/taskModel": { find: () => ({ sort: async () => [] }) },
    "../models/aircraftModel": {},
    "../models/maintenancePriorityRuleModel": { findOne: () => ({ lean: async () => null }) },
    "../utils/partsMonitoringFormulas": {
      ...require("../utils/partsMonitoringFormulas"),
      processDataWithFormulas: (rows) => structuredClone(rows),
    },
    "../utils/partsMonitoringExcelImport": {},
    "../services/partsMonitoringExcelService": {},
    "../utils/realtimeEvents": { publishTypedForRecipients: async (...args) => state.events.push(args) },
  });
  async function call(name, body = {}, params = { aircraft: records[0].aircraft }) {
    let result;
    const res = { status(code) { this.code = code; return this; }, json(value) { result = { status: this.code, ...value }; return this; } };
    await controller[name]({ body, params, query: {}, user: { id: "manager-id" } }, res);
    return result;
  }
  return { state, controller, call };
}

test("a Critical aircraft can be manually downgraded, sorts by effective priority, and Auto clears it", async () => {
  const h = harness([makeRecord(), makeRecord("RP-C1002", "20")]);
  const saved = await h.call("saveMaintenancePriorityOverride", { level: "Low", reason: "", setBy: "forged", appliesToInspectionId: "forged" });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.reason, "");
  assert.equal(saved.data.setBy, "manager-id");
  assert.notEqual(saved.data.appliesToInspectionId, "forged");
  assert.equal(h.state.events.length, 1);
  const ranking = await h.call("getMaintenancePriority");
  assert.equal(ranking.status, 200);
  assert.equal(ranking.data[0].aircraft, "RP-C1002");
  assert.equal(ranking.data[1].priorityLevel, "Low");
  assert.equal(ranking.data[1].priorityRank, 4);
  assert.equal(ranking.data[1].autoPriorityLevel, "Critical");
  assert.ok(ranking.data[1].priorityTriggers.length);
  assert.equal(ranking.data.filter((row) => row.priorityLevel === "Critical").length, 0);
  assert.equal((await h.call("saveMaintenancePriorityOverride", { level: "Auto" })).status, 200);
  assert.equal(h.state.records[0].manualPriorityOverride, undefined);
  assert.equal((await h.call("getMaintenancePriority")).data[0].priorityLevel, "Critical");
});

test("priority override validates levels/reasons, accepts omitted reasons, and handles missing/stale records", async () => {
  const h = harness();
  for (const body of [{ level: "Urgent" }, { level: "Low", reason: {} }, { level: "Auto", reason: 42 }]) {
    assert.equal((await h.call("saveMaintenancePriorityOverride", body)).status, 400);
  }
  assert.equal(h.state.writes, 0);
  assert.equal((await h.call("saveMaintenancePriorityOverride", { level: "High" })).status, 200);
  assert.equal((await h.call("saveMaintenancePriorityOverride", { level: "Low" }, { aircraft: "RP-NOTFOUND" })).status, 404);
  h.state.conflict = true;
  assert.equal((await h.call("saveMaintenancePriorityOverride", { level: "Low" })).status, 409);
  h.state.conflict = false;
  h.state.records[0].parts = [];
  assert.equal((await h.call("saveMaintenancePriorityOverride", { level: "Low" })).status, 409);
  assert.equal((await h.call("saveMaintenancePriorityOverride", { level: "Auto" })).status, 200);
});

test("changing inspection rows or advancing the same row's cycle expires and removes the override", async () => {
  for (const change of [(r) => { r.parts[0]._id = "new-row"; }, (r) => { r.parts[0].hoursCW = "250"; r.parts[0].ttCycleDue = "400"; }]) {
    const h = harness();
    await h.call("saveMaintenancePriorityOverride", { level: "Low" });
    const oldPart = structuredClone(h.state.records[0].parts[0]);
    change(h.state.records[0]);
    const ranking = await h.call("getMaintenancePriority");
    assert.equal(ranking.data[0].priorityLevel, "Critical");
    assert.equal(ranking.data[0].manualPriorityOverride, null);
    assert.equal(h.state.records[0].manualPriorityOverride, undefined);
    h.state.records[0].parts[0] = oldPart;
    assert.equal((await h.call("getMaintenancePriority")).data[0].priorityLevel, "Critical", "expired overrides cannot return after A-B-A selection changes");
  }
});

test("normal countdown and aircraft-total changes retain the same inspection override", async () => {
  const h = harness();
  await h.call("saveMaintenancePriorityOverride", { level: "Low" });
  h.state.records[0].referenceData.acftTT = 250;
  h.state.records[0].referenceData.today = "2026-02-01";
  h.state.records[0].parts[0].timeRemaining = "0";
  h.state.records[0].parts[0].daysRemaining = "-1";
  const ranking = await h.call("getMaintenancePriority");
  assert.equal(ranking.data[0].priorityLevel, "Low");
  assert.equal(ranking.data[0].autoPriorityLevel, "Critical");
  const inspection = { inspectionKey: "150FH", part: makePart() };
  const id = inspectionIdentity(makeRecord(), inspection);
  inspection.part.hoursCW = "100.0";
  inspection.part.dateCW = "01/01/2026";
  assert.equal(inspectionIdentity(makeRecord(), inspection), id);
  assert.notEqual(inspectionIdentity(makeRecord("RP-C1002"), inspection), id);
});

test("the optional override schema preserves existing records and validates saved metadata", () => {
  const Model = require("../models/partsMonitoringModel");
  const existing = new Model(makeRecord());
  assert.equal(existing.manualPriorityOverride, undefined);
  const record = makeRecord();
  delete record._id;
  record.manualPriorityOverride = { level: "Low", setBy: "manager", setAt: new Date(), appliesToInspectionId: "cycle" };
  assert.equal(new Model(record).validateSync(), undefined);
  record.manualPriorityOverride.level = "Unknown";
  assert.ok(new Model(record).validateSync());
});

test("stale cleanup cannot erase an override saved concurrently for the new inspection", async () => {
  const h = harness();
  await h.call("saveMaintenancePriorityOverride", { level: "Low" });
  const record = h.state.records[0];
  record.parts[0]._id = "next-row";
  h.state.beforeCleanup = () => {
    record.manualPriorityOverride = { level: "High", setBy: "another-manager", setAt: new Date("2030-01-01"),
      appliesToInspectionId: inspectionIdentity(record, { inspectionKey: "150FH", part: record.parts[0] }) };
  };
  await h.call("getMaintenancePriority");
  assert.equal(record.manualPriorityOverride.level, "High");
  assert.equal((await h.call("getMaintenancePriority")).data[0].priorityLevel, "High");
});

test("removing the next inspection or its schedule expires a stored override", async () => {
  for (const remove of [(h) => { h.state.records[0].parts = []; }, (h) => { h.state.schedules.length = 0; }]) {
    const h = harness();
    await h.call("saveMaintenancePriorityOverride", { level: "Low" });
    remove(h);
    assert.equal((await h.call("getMaintenancePriority")).data.length, 0);
    assert.equal(h.state.records[0].manualPriorityOverride, undefined);
  }
});

test("override route requires authentication, confirmation, and manager/superadmin permission", async (t) => {
  const h = harness();
  const router = load("../routes/partsMonitoringRoute.js", {
    "../controllers/partsMonitoringController": h.controller,
    "../middleware/authMiddleware": { verifyToken: (req, res, next) => {
      if (!req.headers.authorization) return res.status(401).json({ message: "Unauthorized" });
      req.user = { id: "manager-id", jobTitle: req.headers["x-test-role"], access: req.headers["x-test-access"] };
      next();
    } },
    "../middleware/sessionActivity": { touchSessionActivity: (_req, _res, next) => next() },
  });
  const app = express(); app.use(express.json()); app.use(router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = async (headers) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/maintenance-priority/RP-C1001/override`, {
      method: "PUT", headers: { authorization: "Bearer test", "x-test-role": "maintenance manager", "content-type": "application/json", "x-action-confirmed": "true", ...headers },
      body: JSON.stringify({ level: "Low" }),
    });
    await response.text(); return response.status;
  };
  assert.equal(await request({ authorization: "" }), 401);
  assert.equal(await request({ "x-action-confirmed": "" }), 400);
  for (const role of ["mechanic", "pilot", "officer-in-charge", "warehouse personnel"]) assert.equal(await request({ "x-test-role": role }), 403);
  assert.equal(await request({}), 200);
  assert.equal(await request({ "x-test-role": "superadmin" }), 200);
  assert.equal(await request({ "x-test-role": "mechanic", "x-test-access": "superadmin" }), 200);
});
