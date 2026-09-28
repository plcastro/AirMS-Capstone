const assert = require("node:assert/strict");
const test = require("node:test");
const FlightLog = require("../models/flightLogModel");
const { resolveFlightLogCrew } = require("../utils/flightLogCrew");
const { pickFlightLogPayloadForRequest } = require("../utils/flightLogPayload");

const pilotId = "000000000000000000000001";
const mechanicId = "000000000000000000000002";
const inactiveId = "000000000000000000000003";
const directory = [
  { _id: pilotId, firstName: "Juan", lastName: "Dela Cruz", jobTitle: "Pilot", status: "active" },
  { _id: mechanicId, firstName: "Pedro", lastName: "Santos", jobTitle: "Mechanic", status: "active" },
  { _id: inactiveId, firstName: "Inactive", lastName: "Pilot", jobTitle: "Pilot", status: "inactive" },
];
const users = {
  findOne(query) {
    return { select() { return { async lean() {
      return directory.find((user) => Object.entries(query).every(([key, value]) => user[key] === value)) || null;
    } }; } };
  },
};

test("mechanic assigns an active pilot with a server-resolved name", async () => {
  const req = { user: { jobTitle: "Mechanic" } };
  const result = await resolveFlightLogCrew(req, {
    assignedPilot: { userId: pilotId, name: "Forged name" },
    assignedMechanic: { userId: mechanicId, name: "Should be ignored" },
  }, null, users);
  assert.deepEqual(result, { assignments: { assignedPilot: { userId: pilotId, name: "Juan Dela Cruz" } } });
});

test("pilot assignment survives create and update payload filtering", async () => {
  const req = { user: { jobTitle: "Pilot" } };
  for (const operation of ["create", "update"]) {
    const payload = pickFlightLogPayloadForRequest(req, {
      assignedMechanic: { userId: mechanicId, name: "Forged name" },
      assignedPilot: { userId: pilotId, name: "Ignored" },
      workItems: [{ workDone: "Not permitted for pilot" }],
    }, operation);
    assert.equal(payload.assignedPilot, undefined);
    assert.equal(payload.workItems, undefined);
    const result = await resolveFlightLogCrew(req, payload, null, users);
    assert.deepEqual(result.assignments.assignedMechanic, { userId: mechanicId, name: "Pedro Santos" });
  }
});

test("crew assignments reject inactive, nonexistent, wrong-role and malformed selections", async () => {
  const req = { user: { jobTitle: "Mechanic" } };
  for (const selection of [mechanicId, inactiveId, "000000000000000000000099", "invalid", {}, [], { userId: { $ne: null } }]) {
    const result = await resolveFlightLogCrew(req, { assignedPilot: selection }, null, users);
    assert.ok(result.error, JSON.stringify(selection));
  }
});

test("existing assignments survive unrelated saves after crew deactivation", async () => {
  const existing = { assignedPilot: { userId: inactiveId, name: "Inactive Pilot" } };
  const result = await resolveFlightLogCrew({ user: { jobTitle: "Mechanic" } }, {
    assignedPilot: { userId: inactiveId, name: "Changed by client" },
  }, existing, users);
  assert.deepEqual(result.assignments.assignedPilot, existing.assignedPilot);
});

test("unassigned legacy records and explicitly cleared assignments remain valid", async () => {
  const req = { user: { jobTitle: "Mechanic" } };
  assert.deepEqual(await resolveFlightLogCrew(req, {}, null, users), { assignments: {} });
  assert.deepEqual(await resolveFlightLogCrew(req, { assignedPilot: null }, null, users), { assignments: { assignedPilot: null } });
});

test("crew assignments persist in the flight-log schema for both aircraft types", async () => {
  for (const aircraftType of ["AS350B3", "B412EP"]) {
    const log = new FlightLog({ aircraftType, rpc: "RP-C1234", assignedPilot: { userId: pilotId, name: "Juan Dela Cruz" }, assignedMechanic: { userId: mechanicId, name: "Pedro Santos" } });
    await log.validate();
    const restored = new FlightLog(JSON.parse(JSON.stringify(log)));
    assert.equal(String(restored.assignedPilot.userId), pilotId);
    assert.equal(restored.assignedMechanic.name, "Pedro Santos");
  }
});

test("mechanic payload retains destination edits and existing pilot restrictions", () => {
  const legs = [{ stations: [{ from: "RPLL", to: "RPUI" }], date: "09/19/2026" }];
  const payload = pickFlightLogPayloadForRequest({ user: { jobTitle: "Mechanic" } }, { legs }, "update");
  assert.deepEqual(payload.legs, legs);
});

test("creating pilots and mechanics are assigned their own crew slot from authenticated identity", async () => {
  for (const [id, jobTitle, ownField, otherField, otherId] of [
    [pilotId, "Pilot", "assignedPilot", "assignedMechanic", mechanicId],
    [mechanicId, "Mechanic", "assignedMechanic", "assignedPilot", pilotId],
  ]) {
    const result = await resolveFlightLogCrew({ user: { id, jobTitle } }, {
      [otherField]: { userId: otherId },
      [ownField]: { userId: inactiveId, name: "Forged creator assignment" },
    }, null, users);
    assert.equal(result.assignments[ownField].userId, id);
    assert.equal(result.assignments[otherField].userId, otherId);
  }
});

test("editing an existing flight log does not assign its editor as crew", async () => {
  const result = await resolveFlightLogCrew({ user: { id: mechanicId, jobTitle: "Mechanic" } }, {}, { assignedPilot: null, assignedMechanic: null }, users);
  assert.deepEqual(result, { assignments: {} });
});
