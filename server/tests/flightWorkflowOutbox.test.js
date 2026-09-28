const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pilot = '000000000000000000000001';
const mechanic = '000000000000000000000002';
const replacement = '000000000000000000000003';
const flight = '000000000000000000000004';
const record = () => ({ _id: flight, rpc: 'RP-C1234', controlNo: 'FL-1', status: 'submitted',
  assignedPilot: { userId: pilot }, assignedMechanic: { userId: mechanic },
  workflowHistory: [{ action: 'pre_completed', actorId: pilot }], pendingNotifications: [] });

function harness(log = record()) {
  const rows = new Map(), pushes = [], removals = [];
  let failCreate = false;
  const dependencies = {
    'node:crypto': require('node:crypto'),
    '../models/flightLogModel': {
      findById: () => ({ select: () => ({ lean: async () => log }) }),
      updateOne: async (query, update, options) => {
        removals.push({ query, update, options });
        log.pendingNotifications = log.pendingNotifications.filter(e => e._id !== update.$pull.pendingNotifications._id);
      },
    },
    '../models/notificationModel': { create: async value => {
      if (failCreate) throw new Error('Temporary database outage');
      if (rows.has(value._id)) throw Object.assign(new Error('Duplicate'), { code: 11000 });
      rows.set(value._id, value); return value;
    } },
    './mobilePushService': { sendPushNotificationToUsers: async value => pushes.push(value) },
  };
  const filename = path.join(__dirname, '../utils/flightWorkflowNotificationOutbox.js');
  const module = { exports: {} };
  vm.compileFunction(fs.readFileSync(filename, 'utf8'), ['require', 'module', 'exports'], { filename })(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency ${name}`); return dependencies[name];
  }, module, module.exports);
  return { ...module.exports, rows, pushes, removals, log, failCreate: value => { failCreate = value; } };
}

test('workflow outbox uses stable event IDs, assigned recipients and inspection section links', () => {
  const h = harness(), first = h.pendingFlightNotification(h.log, 2);
  assert.equal(first._id, h.pendingFlightNotification(h.log, 2)._id);
  assert.notEqual(first._id, h.pendingFlightNotification(h.log, 3)._id);
  assert.deepEqual(first.recipientUsers, [mechanic]);
  assert.equal(first.metadata.targetSection, 'pre');
  assert.equal(first.metadata.targetFlightLogId, flight);
  assert.equal(first.metadata.version, 3);
  assert.equal(JSON.stringify(first).includes('signature'), false);
});

test('delivery retries retain failed events and create only one persistent notification', async () => {
  const h = harness(), event = h.pendingFlightNotification(h.log, 0);
  h.log.pendingNotifications = [event];
  h.failCreate(true);
  await assert.rejects(h.flushFlightNotifications(flight), /outage/);
  assert.equal(h.log.pendingNotifications.length, 1);
  assert.equal(h.removals.length, 0);
  h.failCreate(false);
  await h.flushFlightNotifications(flight);
  assert.equal(h.rows.size, 1);
  assert.equal(h.pushes.length, 1);
  assert.equal(h.log.pendingNotifications.length, 0);
  // Simulate a worker dying after creating the notification but before removing its event.
  h.log.pendingNotifications = [event];
  await h.flushFlightNotifications(flight);
  assert.equal(h.rows.size, 1);
  assert.equal(h.pushes.length, 1);
  assert.equal(h.removals[0].options.timestamps, false);
  assert.equal(h.removals[0].update.$inc, undefined);
});

test('delayed delivery does not notify a removed assignee or broadcast to a role', async () => {
  const h = harness();
  h.log.pendingNotifications = [h.pendingFlightNotification(h.log, 0)];
  h.log.assignedMechanic = { userId: replacement };
  await h.flushFlightNotifications(flight);
  assert.equal(h.rows.size, 0);
  assert.equal(h.pushes.length, 0);
  assert.equal(h.log.pendingNotifications.length, 0);
  h.log.assignedPilot = null; h.log.assignedMechanic = null;
  assert.equal(h.pendingFlightNotification(h.log, 1), null);
});
