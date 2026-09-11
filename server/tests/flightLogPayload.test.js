const assert = require("node:assert/strict");
const test = require("node:test");

const FlightLog = require("../models/flightLogModel");
const {
  canEditFlightLogRequest,
  getTrustedFlightLogRole,
  hasSuperadminFlightLogAccess,
  hasCompleteFlightLogLegs,
  isB412AircraftType,
  isMechanicFlightLogRequest,
  isPilotFlightLogRequest,
  isRestrictedPilotFlightLogRequest,
  mergePilotB412Update,
  pickFlightLogPayloadForRequest,
} = require("../utils/flightLogPayload");

const completeLeg = () => ({
  stations: [{ from: "RPLL", to: "RPUI" }],
  date: "09/10/2026",
});

test("flight-log role comes only from the authenticated user", () => {
  const pilotRequest = {
    user: { jobTitle: "Pilot", access: "User" },
  };

  assert.equal(getTrustedFlightLogRole(pilotRequest), "pilot");
  assert.equal(isPilotFlightLogRequest(pilotRequest), true);
  assert.equal(
    isPilotFlightLogRequest({ body: { createdBy: "pilot" } }),
    false,
  );
  assert.equal(isB412AircraftType("Bell 412-EP"), true);
  assert.equal(isB412AircraftType("AS350B3"), false);
  const officerRequest = {
    user: { jobTitle: "Officer-In-Charge", access: "User" },
  };
  assert.equal(isMechanicFlightLogRequest(officerRequest), false);
  assert.equal(canEditFlightLogRequest(officerRequest), false);

  const elevatedPilotRequest = {
    user: { jobTitle: "Pilot", access: "Superadmin" },
  };
  assert.equal(hasSuperadminFlightLogAccess(elevatedPilotRequest), true);
  assert.equal(isPilotFlightLogRequest(elevatedPilotRequest), true);
  assert.equal(isRestrictedPilotFlightLogRequest(elevatedPilotRequest), false);
  assert.equal(isMechanicFlightLogRequest(elevatedPilotRequest), true);
});

test("pilot AS350 create payload cannot attach B412-only data", () => {
  const payload = pickFlightLogPayloadForRequest(
    { user: { jobTitle: "Pilot" } },
    {
      aircraftType: "AS350B3",
      rpc: "RP-C1234",
      legs: [completeLeg()],
      b412Data: { serialNumber: "not-applicable" },
    },
    "create",
  );

  assert.equal(Object.hasOwn(payload, "b412Data"), false);
});

test("pilot create payload keeps metadata and pilot sections only", () => {
  const req = { user: { id: "pilot-id", jobTitle: "Pilot" } };
  const payload = pickFlightLogPayloadForRequest(
    req,
    {
      aircraftType: "B412EP",
      rpc: "RP-C4120",
      date: "09/10/2026",
      controlNo: "FL-001",
      sling: "External load note",
      legs: [completeLeg()],
      remarks: "Chip light observed",
      createdByName: "Test Pilot",
      createdBy: "mechanic",
      componentData: {
        broughtForwardData: { airframe: "1200" },
        toDateData: { airframe: "1200" },
      },
      fuelServicing: [{ mainAdd: "10" }],
      oilServicing: [{ engineAdd: "1" }],
      workItems: [{ workDone: "unauthorized" }],
      b412Data: {
        serialNumber: "36654",
        passengerRows: [{ legs: ["2"] }],
        discrepancyRemarks: "Chip light observed",
        componentData: {
          broughtForwardData: { airframe: "1200" },
          toDateData: { airframe: "1200" },
        },
        fuelServicing: [{ mainTankAdded: "999" }],
        correctionItems: [{ workDone: "unauthorized" }],
      },
      status: "completed",
      notifiedForCompletion: true,
      releasedBy: { name: "spoofed" },
      acceptedBy: { name: "spoofed" },
      broughtForwardLocked: true,
    },
    "create",
  );

  assert.deepEqual(Object.keys(payload).sort(), [
    "aircraftType",
    "b412Data",
    "componentData",
    "controlNo",
    "createdByName",
    "date",
    "legs",
    "remarks",
    "rpc",
    "sling",
  ]);
  assert.deepEqual(payload.b412Data, {
    serialNumber: "36654",
    passengerRows: [{ legs: ["2"] }],
    discrepancyRemarks: "Chip light observed",
    componentData: {
      broughtForwardData: { airframe: "1200" },
      toDateData: { airframe: "1200" },
    },
  });
  assert.deepEqual(payload.componentData, {
    broughtForwardData: { airframe: "1200" },
    toDateData: { airframe: "1200" },
  });
});

test("pilot update payload cannot mutate mechanic or workflow fields", () => {
  const req = { user: { jobTitle: "Pilot" } };
  const payload = pickFlightLogPayloadForRequest(
    req,
    {
      legs: [completeLeg()],
      sling: "Updated sling note",
      remarks: "Updated remark",
      notifiedForCompletion: true,
      componentData: { toDateData: { airframe: "999" } },
      fuelServicing: [{ mainAdd: "999" }],
      oilServicing: [{ engineAdd: "999" }],
      workItems: [{ workDone: "unauthorized" }],
      b412Data: {
        serialNumber: "cannot change",
        passengerRows: [{ legs: ["3"] }],
        discrepancyRemarks: "Updated remark",
        componentData: { toDateData: { airframe: "999" } },
        fuelServicing: [{ mainTankAdded: "999" }],
        correctionItems: [{ workDone: "unauthorized" }],
      },
      status: "completed",
      releasedBy: { name: "spoofed" },
      acceptedBy: { name: "spoofed" },
      broughtForwardLocked: true,
    },
    "update",
  );

  assert.deepEqual(Object.keys(payload).sort(), [
    "b412Data",
    "legs",
    "notifiedForCompletion",
    "remarks",
    "sling",
  ]);
  assert.deepEqual(payload.b412Data, {
    passengerRows: [{ legs: ["3"] }],
    discrepancyRemarks: "Updated remark",
  });

  const resetAttempt = pickFlightLogPayloadForRequest(
    req,
    { notifiedForCompletion: false },
    "update",
  );
  assert.deepEqual(resetAttempt, {});

  const nestedClearAttempt = pickFlightLogPayloadForRequest(
    req,
    { b412Data: null },
    "update",
  );
  assert.deepEqual(nestedClearAttempt, { b412Data: {} });
});

test("pilot B412 edits preserve mechanic and export-specific data", () => {
  const merged = mergePilotB412Update(
    {
      serialNumber: "36654",
      passengerRows: [{ legs: ["1"] }],
      discrepancyRemarks: "Old",
      componentData: { toDateData: { airframe: "12" } },
      fuelServicing: [{ mainTankAdded: "5" }],
      correctionItems: [{ workDone: "Inspected" }],
    },
    {
      passengerRows: [{ legs: ["3"] }],
      discrepancyRemarks: "Updated",
    },
  );

  assert.deepEqual(merged, {
    serialNumber: "36654",
    passengerRows: [{ legs: ["3"] }],
    discrepancyRemarks: "Updated",
    componentData: { toDateData: { airframe: "12" } },
    fuelServicing: [{ mainTankAdded: "5" }],
    correctionItems: [{ workDone: "Inspected" }],
  });
});

test("non-pilot payload retains standard and legacy-compatible fields", () => {
  const payload = pickFlightLogPayloadForRequest(
    { user: { jobTitle: "Mechanic" } },
    {
      componentData: { thisFlightData: {} },
      fuelServicing: [],
      b412Data: { serialNumber: "legacy" },
      unknownField: "discarded",
    },
    "update",
  );

  assert.deepEqual(payload, {
    componentData: { thisFlightData: {} },
    fuelServicing: [],
    b412Data: { serialNumber: "legacy" },
  });
});

test("all aircraft use the same dynamic-leg completeness rule", () => {
  assert.equal(hasCompleteFlightLogLegs([completeLeg()]), true);
  assert.equal(hasCompleteFlightLogLegs([]), false);
  assert.equal(
    hasCompleteFlightLogLegs([
      completeLeg(),
      { stations: [{ from: "", to: "" }], date: "" },
    ]),
    false,
  );
});

test("B412 flight log model accepts one standard top-level leg", async () => {
  const flightLog = new FlightLog({
    aircraftType: "B412EP",
    rpc: "RP-C4120",
    legs: [completeLeg()],
    componentData: {
      broughtForwardData: {},
      thisFlightData: {},
      toDateData: {},
    },
    b412Data: { serialNumber: "36654" },
    remarks: "",
  });

  await assert.doesNotReject(() => flightLog.validate());
  assert.equal(flightLog.legs.length, 1);
  assert.equal(flightLog.b412Data.serialNumber, "36654");
});
