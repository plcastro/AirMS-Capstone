const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../client-web/src/pages/dashboard/reports/MaintenanceDashboard.jsx"), "utf8");
const start = source.indexOf("const fetchReportData = async () => {");
const end = source.indexOf("    fetchReportData();", start);
assert.ok(start >= 0 && end > start, "dashboard report loader must exist");

async function loadReports(status = 200) {
  const calls = [];
  const warnings = [];
  const errors = [];
  const loading = [];
  let tasks;
  const context = {
    API_BASE: "https://api.example.test",
    // Cookie-only web login intentionally provides no Authorization header.
    getAuthHeader: async () => ({ "x-session-id": "manager-session", "x-platform": "WEB" }),
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: status === 200, status, json: async () => [{ _id: "report-record", status: "completed" }] };
    },
    message: { warning: (value) => warnings.push(value), error: (value) => errors.push(value) },
    console: { error() {} },
    setLoadingTasks: (value) => loading.push(value),
    getArrayData: (value) => Array.isArray(value) ? value : [],
    isCompletedTask: (task) => task.status === "completed",
    getTaskDueDate: () => null,
    buildAircraftBaseLookup: () => ({}),
    setTasks: (value) => { tasks = value; },
  };
  for (const setter of ["setBaseAnalytics", "setAircraftBaseByTail", "setPartsRecords", "setFlightLogs", "setPreInspections", "setPostInspections", "setPartsRequisitions", "setStats"]) context[setter] = () => {};
  const run = vm.runInNewContext(`(() => { ${source.slice(start, end)} return fetchReportData; })()`, context);
  await run();
  return { calls, warnings, errors, loading, tasks };
}

test("maintenance reports load all datasets with a cookie-only web session", async () => {
  const result = await loadReports();
  assert.equal(result.calls.length, 8);
  for (const { options } of result.calls) {
    assert.equal(options.credentials, "include");
    assert.equal(options.headers["x-session-id"], "manager-session");
    assert.equal(options.headers.Authorization, undefined);
  }
  assert.equal(result.tasks[0]._id, "report-record");
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.loading, [true, false]);
});

test("reports still reject data when the server rejects the session", async () => {
  const result = await loadReports(401);
  assert.equal(result.calls.length, 8);
  assert.equal(result.warnings.length, 8);
  assert.equal(result.tasks.length, 0);
  assert.deepEqual(result.loading, [true, false]);
});
