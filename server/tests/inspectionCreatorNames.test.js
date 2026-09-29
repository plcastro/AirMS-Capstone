const assert = require("node:assert/strict");
const test = require("node:test");
const { withInspectionCreatorNames } = require("../utils/inspectionCreatorNames");

test("inspection creators use full names from a single lookup and retain ownership IDs", async () => {
  const creator = "aaaaaaaaaaaaaaaaaaaaaaaa";
  const deleted = "bbbbbbbbbbbbbbbbbbbbbbbb";
  const records = [
    { _id: "pre", createdBy: creator, assignedMechanic: { name: "Different Mechanic" } },
    { _id: "post", createdBy: creator },
    { _id: "deleted", createdBy: deleted },
  ];
  let calls = 0;
  const users = { find(filter) {
    calls++;
    assert.deepEqual(filter, { _id: { $in: [creator, deleted] } });
    return { select(fields) {
      assert.equal(fields, "firstName lastName");
      return { lean: async () => [{ _id: creator, firstName: " Marian ", lastName: " Manansala " }] };
    } };
  } };
  const result = await withInspectionCreatorNames(records, users);
  assert.equal(calls, 1);
  assert.equal(result[0].createdByName, "Marian Manansala");
  assert.equal(result[1].createdByName, "Marian Manansala");
  assert.equal(result[2].createdByName, "Unknown user");
  assert.equal(result[0].createdBy, creator);
  assert.equal(records[0].createdByName, undefined);
});

test("legacy creator names and empty records need no database lookup", async () => {
  const users = { find() { assert.fail("No IDs to resolve"); } };
  const result = await withInspectionCreatorNames([{ createdBy: "Legacy Full Name" }, { createdBy: "" }, {}], users);
  assert.deepEqual(result.map((record) => record.createdByName), ["Legacy Full Name", "Unknown user", "Unknown user"]);
  assert.deepEqual(await withInspectionCreatorNames([], users), []);
});
