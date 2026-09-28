const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const servicePath = path.join(__dirname, "../utils/preInspectionNotificationService.js");
const loadService = vm.compileFunction(fs.readFileSync(servicePath, "utf8"), ["require", "module", "exports"], { filename: servicePath });
const pilotId = "000000000000000000000001";
const mechanicId = "000000000000000000000002";
const otherId = "000000000000000000000003";
const record = (status) => ({ _id: "000000000000000000000004", rpc: "RP-C1234", status,
  assignedPilot: { userId: pilotId }, assignedMechanic: { userId: mechanicId }, createdByUserId: otherId });

const notify = async (options) => {
  const stored = [], pushes = [];
  const service = { exports: {} };
  const stubs = {
    "../models/notificationModel": { create: async (value) => { stored.push(value); return { _id: "notification" }; } },
    "./mobilePushService": { sendPushNotificationToUsers: async (value) => pushes.push(value) },
  };
  loadService((name) => { assert.ok(Object.hasOwn(stubs, name)); return stubs[name]; }, service, service.exports);
  await service.exports.createPreInspectionNotifications(options);
  return { stored, pushes };
};

test("every Pre-Flight event notifies only assigned crew in-app and by push", async () => {
  for (const status of ["pending", "released", "completed"]) {
    for (const previousInspection of [null, record(status), record("pending")]) {
      const inspection = record(status);
      const { stored, pushes } = await notify({ previousInspection, inspection, actorUserId: otherId });
      assert.equal(stored.length, 1);
      assert.equal(pushes.length, 1);
      for (const notification of [...stored, ...pushes]) {
        assert.deepEqual(notification.recipientRoles, []);
        assert.deepEqual(notification.recipientUsers, [pilotId, mechanicId]);
      }
      assert.equal(pushes[0].data.targetPreInspectionId, inspection._id);
      assert.equal(pushes[0].data.targetScreen, "Pre-Flight Inspection");
    }
  }
});

test("Pre-Flight notifications exclude the actor and never fall back to creator or role", async () => {
  for (const [actorUserId, target] of [[pilotId, mechanicId], [mechanicId, pilotId]]) {
    const { stored, pushes } = await notify({ inspection: record("released"), actorUserId });
    assert.deepEqual(stored[0].recipientUsers, [target]);
    assert.deepEqual(pushes[0].recipientUsers, [target]);
  }
  const unassigned = { ...record("released"), assignedPilot: null, assignedMechanic: null };
  assert.deepEqual(await notify({ inspection: unassigned, actorUserId: otherId }), { stored: [], pushes: [] });
});
