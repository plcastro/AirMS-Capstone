const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AIRCRAFT_DATA_TARGETS,
  CONFIRMATION_PHRASE,
  parseArguments,
  validateExecution,
} = require("../scripts/cleanupAircraftData");

test("aircraft cleanup defaults to dry-run", () => {
  assert.deepEqual(parseArguments([]), {
    execute: false,
    backupConfirmed: false,
    confirmation: "",
    expectedDatabase: "",
    help: false,
  });
});

test("aircraft cleanup requires every destructive-operation guard", () => {
  assert.throws(
    () => validateExecution({ execute: true }, "airms"),
    /backup/i,
  );
  assert.throws(
    () =>
      validateExecution(
        { execute: true, backupConfirmed: true },
        "airms",
      ),
    /--confirm/i,
  );
  assert.throws(
    () =>
      validateExecution(
        {
          execute: true,
          backupConfirmed: true,
          confirmation: CONFIRMATION_PHRASE,
        },
        "airms",
      ),
    /--database/i,
  );
  assert.throws(
    () =>
      validateExecution(
        {
          execute: true,
          backupConfirmed: true,
          confirmation: CONFIRMATION_PHRASE,
          expectedDatabase: "another-database",
        },
        "airms",
      ),
    /not "another-database"/i,
  );
  assert.doesNotThrow(() =>
    validateExecution(
      {
        execute: true,
        backupConfirmed: true,
        confirmation: CONFIRMATION_PHRASE,
        expectedDatabase: "airms",
      },
      "airms",
    ),
  );
});

test("aircraft cleanup targets operational collections without user data", () => {
  const collections = AIRCRAFT_DATA_TARGETS.map((target) => target.collection);

  assert.deepEqual(collections, [
    "notifications",
    "aiinsightcaches",
    "airectifications",
    "maintenancelogs",
    "technicallogs",
    "partsrequisitions",
    "tasks",
    "pre_inspections",
    "post_inspections",
    "flightlogs",
    "partslifespanmonitorings",
    "aircrafts",
  ]);
  assert.equal(collections.includes("users"), false);
  assert.equal(collections.includes("messages"), false);
  assert.equal(collections.includes("userlogs"), false);
});
