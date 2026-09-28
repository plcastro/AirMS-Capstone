const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const mongoose = require("mongoose");

const servicePath = path.join(__dirname, "../utils/flightLogNotificationService.js");
const loadService = vm.compileFunction(fs.readFileSync(servicePath, "utf8"), ["require", "module", "exports"], { filename: servicePath });
const pilotId = "000000000000000000000001";
const mechanicId = "000000000000000000000002";
const unrelatedId = "000000000000000000000003";
const replacementId = "000000000000000000000004";
const logId = "000000000000000000000005";

const makeLog = (values = {}) => ({
  _id: logId, rpc: "RP-C1234", aircraftType: "AS350B3", status: "pending_release",
  assignedPilot: { userId: pilotId, name: "Pilot" },
  assignedMechanic: { userId: mechanicId, name: "Mechanic" },
  createdByUserId: unrelatedId,
  createdByName: "Unassigned creator",
  ...values,
});

const notify = async (options) => {
  const notifications = [];
  const pushes = [];
  const stubs = {
    "../models/notificationModel": {
      create: async (value) => { notifications.push(value); return { _id: "notification-id" }; },
    },
    "./mobilePushService": {
      sendPushNotificationToUsers: async (value) => { pushes.push(value); },
    },
  };
  const service = { exports: {} };
  loadService((name) => {
    assert.ok(Object.hasOwn(stubs, name), `Unexpected notification dependency: ${name}`);
    return stubs[name];
  }, service, service.exports);
  await service.exports.createFlightLogNotifications(options);
  return { notifications, pushes };
};

test("all flight-log events send in-app and push notifications only to assigned crew", async () => {
  const scenarios = [
    [null, makeLog(), "created-pending-release"],
    [null, makeLog({ status: "pending_acceptance" }), "created-pending-acceptance"],
    [makeLog(), makeLog({ status: "pending_acceptance" }), "released"],
    [makeLog(), makeLog({ status: "released" }), "released"],
    [makeLog({ status: "pending_acceptance" }), makeLog({ status: "accepted" }), "accepted"],
    [makeLog({ status: "accepted" }), makeLog({ status: "accepted", notifiedForCompletion: true }), "ready-for-completion"],
    [makeLog({ status: "accepted" }), makeLog({ status: "completed" }), "completed"],
    [makeLog({ status: "accepted" }), makeLog(), "pending-release"],
    ...["pending_release", "pending_acceptance", "released", "accepted", "completed"].map((status) => [makeLog({ status }), makeLog({ status }), "updated"]),
  ];
  for (const [previousFlightLog, flightLog, notificationType] of scenarios) {
    const { notifications, pushes } = await notify({ previousFlightLog, flightLog, actorUserId: unrelatedId });
    assert.equal(notifications.length, 1, notificationType);
    assert.equal(pushes.length, 1, notificationType);
    for (const message of [...notifications, ...pushes]) {
      assert.deepEqual(message.recipientUsers, [pilotId, mechanicId]);
      assert.deepEqual(message.recipientRoles, []);
    }
    assert.equal(notifications[0].metadata.notificationType, notificationType);
    assert.equal(pushes[0].data.targetFlightLogId, logId);
    assert.equal(pushes[0].data.targetScreen, "Flight Logbook");
  }
});

test("crew do not receive notifications about their own actions", async () => {
  for (const [actorUserId, expected] of [[pilotId, mechanicId], [mechanicId, pilotId]]) {
    const { notifications, pushes } = await notify({ previousFlightLog: makeLog(), flightLog: makeLog(), actorUserId });
    assert.deepEqual(notifications[0].recipientUsers, [expected]);
    assert.deepEqual(pushes[0].recipientUsers, [expected]);
  }
});

test("reassignment notifies current crew rather than the previous assignee", async () => {
  const { notifications } = await notify({ previousFlightLog: makeLog(), flightLog: makeLog({ assignedPilot: { userId: replacementId } }), actorUserId: mechanicId });
  assert.deepEqual(notifications[0].recipientUsers, [replacementId]);
});

test("unassigned legacy logs never fall back to creators, signers, or role broadcasts", async () => {
  const log = makeLog({ assignedPilot: null, assignedMechanic: null, releasedBy: { userId: mechanicId }, acceptedBy: { userId: pilotId } });
  const result = await notify({ previousFlightLog: null, flightLog: log, actorUserId: unrelatedId });
  assert.deepEqual(result, { notifications: [], pushes: [] });
  const ownLog = makeLog({ assignedPilot: null });
  assert.deepEqual(await notify({ previousFlightLog: ownLog, flightLog: ownLog, actorUserId: mechanicId }), { notifications: [], pushes: [] });
});

test("ObjectId crew values are normalized and duplicate recipients are removed", async () => {
  const log = makeLog({ assignedPilot: { userId: new mongoose.Types.ObjectId(pilotId) }, assignedMechanic: { userId: pilotId } });
  const { notifications, pushes } = await notify({ flightLog: log });
  assert.deepEqual(notifications[0].recipientUsers, [pilotId]);
  assert.deepEqual(pushes[0].recipientUsers, [pilotId]);
});

test("a combined acceptance and submission creates only one completion notification", async () => {
  const { notifications } = await notify({ previousFlightLog: makeLog({ status: "pending_acceptance" }), flightLog: makeLog({ status: "accepted", notifiedForCompletion: true }), actorUserId: pilotId });
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].metadata.notificationType, "ready-for-completion");
});
