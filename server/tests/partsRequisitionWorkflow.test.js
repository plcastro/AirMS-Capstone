const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  createRequire
} = require('node:module');
const workflow = require('../../shared/partsRequisitionWorkflow.js');
const {
  computedStatus,
  displayStatus,
  canAct,
  canCreate,
  followUpTarget,
  buildTimeline,
  rankPartSuggestions,
  updatedFirst
} = workflow;
function load(file, stubs) {
  const filename = path.resolve(__dirname, file),
    localRequire = createRequire(filename),
    module = {
      exports: {}
    };
  vm.compileFunction(fs.readFileSync(filename, 'utf8'), ['require', 'module', 'exports'], {
    filename
  })(name => Object.hasOwn(stubs, name) ? stubs[name] : localRequire(name), module, module.exports);
  return module.exports;
}
const user = (role, id = 'owner') => ({
  id,
  jobTitle: role,
  firstName: 'Test',
  lastName: role
});
const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});
function harness(initial = {}) {
  let record = {
    _id: 'r1',
    wrsNo: 'WRS-TEST',
    staff: {
      requisitionerId: 'owner'
    },
    status: 'Requested',
    items: [{
      _id: 'i1',
      particular: 'Filter',
      stockStatus: 'Pending Check'
    }, {
      _id: 'i2',
      particular: 'Seal',
      stockStatus: 'Pending Check'
    }],
    updatedAt: new Date('2026-01-01'),
    ...initial
  };
  const writes = [],
    notices = [],
    nudges = [];
  const model = {
    findById: () => ({
      lean: async () => structuredClone(record)
    }),
    findOneAndUpdate: async (filter, update) => {
      writes.push({
        filter,
        update
      });
      record = {
        ...record,
        ...update.$set,
        history: [...(record.history || []), update.$push.history],
        updatedAt: new Date()
      };
      return record;
    },
    create: async data => {
      writes.push(data);
      record = {
        ...data,
        _id: 'created'
      };
      return record;
    },
    distinct: async field => field === 'items.particular' ? ['Filter', 'Seal', ' filter ', 'Oil filter'] : ['Legacy filter']
  };
  const controller = load('../controllers/partsRequisitionController.js', {
    '../models/partsRequisitionModel': model,
    './logsController': {
      auditLog: async () => {}
    },
    '../utils/partsRequisitionNotificationService': {
      createPartsRequisitionNotifications: async data => notices.push(data),
      sendRequisitionFollowUp: async data => nudges.push(data)
    },
    '../utils/realtimeEvents': {
      publishTypedForRecipients: async () => {}
    }
  });
  return {
    controller,
    model,
    writes,
    notices,
    nudges,
    record: () => record,
    act: async (actor, action, extra = {}) => {
      const res = response();
      await controller.updateRequisitionStatus({
        user: actor,
        params: {
          id: 'r1'
        },
        body: {
          action,
          ...extra
        }
      }, res);
      return res;
    }
  };
}
test('all item status permutations use pending before out-of-stock before ready', () => {
  for (let length = 1; length <= 4; length++) {
    for (let n = 0; n < 3 ** length; n++) {
      const states = Array.from({
        length
      }, (_, i) => workflow.itemStatuses[Math.floor(n / 3 ** i) % 3]);
      const record = {
        items: states.map(stockStatus => ({
          stockStatus
        }))
      };
      assert.equal(computedStatus(record), states.includes('Pending Check') ? 'Requested' : states.includes('Out of Stock') ? 'Awaiting Stock' : 'Ready for Delivery');
      assert.equal(computedStatus({
        ...record,
        deliveredAt: '2026-01-01'
      }), 'Delivered');
      assert.equal(computedStatus({
        ...record,
        confirmedAt: '2026-01-02'
      }), 'Closed');
      assert.equal(computedStatus({
        ...record,
        cancelledAt: '2026-01-01'
      }), 'Cancelled');
    }
  }
  assert.equal(computedStatus({
    items: []
  }), 'Requested');
});
test('server rejects every cross-role action before any write', async () => {
  for (const role of ['Mechanic', 'Maintenance Manager', 'Officer-In-Charge', 'Warehouse Personnel', 'Pilot']) {
    for (const action of ['stock', 'deliver', 'confirm', 'cancel', 'follow-up', 'approve']) {
      const h = harness();
      const actor = user(role, 'other');
      if (canAct(actor, h.record(), action)) continue;
      assert.equal((await h.act(actor, action, {
        itemId: 'i1',
        stockStatus: 'In Stock'
      })).statusCode, 403, `${role}: ${action}`);
      assert.equal(h.writes.length, 0);
    }
  }
});
test('creation roles and requester identity are enforced, supplied status/timestamps are ignored', async () => {
  for (const role of ['Mechanic', 'Maintenance Manager', 'Admin Staff', 'Warehouse Personnel', 'Officer-In-Charge', 'Pilot']) {
    const h = harness(),
      res = response();
    await h.controller.createRequisition({
      user: user(role),
      body: {
        aircraft: 'RP-TEST',
        staff: {
          requisitionerId: 'other'
        },
        items: [{
          particular: 'Filter',
          quantity: 1,
          unitOfMeasure: 'PC',
          stockStatus: 'In Stock',
          availableQty: 100
        }],
        status: 'Closed',
        confirmedAt: new Date()
      }
    }, res);
    assert.equal(res.statusCode, canCreate(user(role)) ? 201 : 403);
    if (res.statusCode === 201) {
      assert.equal(res.body.staff.requisitionerId, 'owner');
      assert.equal(res.body.status, 'Requested');
      assert.equal(res.body.items[0].stockStatus, 'Pending Check');
      assert.equal(res.body.items[0].availableQty, undefined);
      assert.equal(res.body.confirmedAt, undefined);
    }
  }
});
test('full lifecycle supports repeated stock reversals then delivery and owner confirmation', async () => {
  const h = harness(),
    warehouse = user('Warehouse Personnel', 'warehouse');
  assert.equal((await h.act(warehouse, 'deliver')).statusCode, 409);
  await h.act(warehouse, 'stock', {
    itemId: 'i1',
    stockStatus: 'Out of Stock'
  });
  assert.equal(h.record().status, 'Requested');
  await h.act(warehouse, 'stock', {
    itemId: 'i2',
    stockStatus: 'In Stock'
  });
  assert.equal(h.record().status, 'Awaiting Stock');
  assert.equal((await h.act(user('Officer-In-Charge'), 'follow-up')).statusCode, 200);
  assert.equal(h.nudges.length, 1);
  await h.act(warehouse, 'stock', {
    itemId: 'i1',
    stockStatus: 'In Stock'
  });
  assert.equal(h.record().status, 'Ready for Delivery');
  await h.act(warehouse, 'stock', {
    itemId: 'i1',
    stockStatus: 'Out of Stock'
  });
  assert.equal(h.record().status, 'Awaiting Stock');
  await h.act(warehouse, 'stock', {
    itemId: 'i1',
    stockStatus: 'In Stock'
  });
  assert.equal((await h.act(warehouse, 'deliver')).statusCode, 200);
  assert.ok(h.record().deliveredAt);
  assert.equal(h.record().deliveredBy, 'warehouse');
  assert.equal((await h.act(warehouse, 'stock', {
    itemId: 'i1',
    stockStatus: 'Out of Stock'
  })).statusCode, 409);
  assert.equal((await h.act(user('Mechanic'), 'cancel')).statusCode, 409);
  assert.equal((await h.act(user('Maintenance Manager'), 'confirm')).statusCode, 200);
  assert.equal(h.record().status, 'Closed');
  assert.ok(h.record().confirmedAt);
  assert.equal(followUpTarget(h.record()), null);
  assert.equal((await h.act(user('Officer-In-Charge'), 'follow-up')).statusCode, 409);
  assert.equal((await h.act(user('Mechanic'), 'confirm')).statusCode, 409);
  assert.equal(h.notices.length, 7);
  assert.equal(buildTimeline(h.record()).filter(event => event.label === 'Stock checked').length, 5);
});
test('cancellation is allowed only to the mechanic or manager owner before delivery', async () => {
  for (const status of workflow.requisitionStatuses) for (const actor of [user('Mechanic'), user('Maintenance Manager'), user('Mechanic', 'other'), user('Officer-In-Charge'), user('Admin Staff')]) {
    const h = harness({
      status
    });
    const res = await h.act(actor, 'cancel');
    const ownerRole = ['Mechanic', 'Maintenance Manager'].includes(actor.jobTitle) && actor.id === 'owner';
    assert.equal(res.statusCode, !ownerRole ? 403 : ['Requested', 'Awaiting Stock', 'Ready for Delivery'].includes(status) ? 200 : 409);
  }
});
test('stock batch saves once and delivery can atomically include the final stock choices', async () => {
  const h = harness();
  const actor = user('Warehouse Personnel', 'warehouse');
  assert.equal((await h.act(actor, 'stock', { stockUpdates: [{ itemId: 'i1', stockStatus: 'In Stock' }, { itemId: 'i2', stockStatus: 'Out of Stock' }] })).statusCode, 200);
  assert.equal(h.writes.length, 1);
  assert.equal(h.record().status, 'Awaiting Stock');
  assert.match(h.record().history[0].details, /Seal: Pending Check → Out of Stock/);
  assert.equal((await h.act(actor, 'deliver', { stockUpdates: [{ itemId: 'i2', stockStatus: 'In Stock' }] })).statusCode, 200);
  assert.equal(h.writes.length, 2);
  assert.equal(h.record().status, 'Delivered');
  assert.ok(h.record().items.every(item => item.stockStatus === 'In Stock'));
  assert.match(h.record().history[1].details, /Seal: Out of Stock → In Stock/);
});
test('invalid batches and incomplete delivery never partially save', async () => {
  for (const stockUpdates of [[], [{ itemId: 'missing', stockStatus: 'In Stock' }], [{ itemId: 'i1', stockStatus: 'Pending Check' }], [{ itemId: 'i1', stockStatus: 'In Stock' }, { itemId: 'i1', stockStatus: 'Out of Stock' }]]) {
    const h = harness();
    assert.equal((await h.act(user('Warehouse Personnel'), 'stock', { stockUpdates })).statusCode, 400);
    assert.equal(h.writes.length, 0);
  }
  const h = harness();
  assert.equal((await h.act(user('Warehouse Personnel'), 'deliver', { stockUpdates: [{ itemId: 'i1', stockStatus: 'In Stock' }] })).statusCode, 409);
  assert.equal(h.writes.length, 0);
  assert.equal(h.record().items[0].stockStatus, 'Pending Check');
});
test('follow-up only targets warehouse for stock waiting and owner for unconfirmed delivery', async () => {
  for (const status of workflow.requisitionStatuses) {
    const h = harness({
        status
      }),
      target = followUpTarget(h.record());
    assert.equal(target, ['Requested', 'Awaiting Stock'].includes(status) ? 'warehouse' : status === 'Delivered' ? 'requester' : null);
    assert.equal((await h.act(user('Officer-In-Charge'), 'follow-up')).statusCode, target ? 200 : 409);
    assert.equal(h.nudges.length, target ? 1 : 0);
  }
});
test('stale concurrent updates are rejected without emitting notifications', async () => {
  const h = harness();
  h.model.findOneAndUpdate = async () => null;
  assert.equal((await h.act(user('Warehouse Personnel'), 'stock', {
    itemId: 'i1',
    stockStatus: 'In Stock'
  })).statusCode, 409);
  assert.equal(h.notices.length, 0);
});
test('legacy values render without mutating records, and history keeps old events', () => {
  for (const [status, expected] of Object.entries({
    Pending: 'Requested',
    'Parts Requested': 'Requested',
    Approved: 'Ready for Delivery',
    Ordered: 'Ready for Delivery',
    'To Be Ordered': 'Awaiting Stock',
    'In Progress': 'Awaiting Stock',
    Completed: 'Closed',
    Rejected: 'Cancelled'
  })) {
    const record = {
      status
    };
    assert.equal(displayStatus(record), expected);
    assert.equal(record.status, status);
  }
  assert.equal(displayStatus({
    status: 'Availability Checked',
    items: [{
      stockStatus: 'Out of Stock'
    }]
  }), 'Awaiting Stock');
  assert.equal(buildTimeline({
    dateRequested: '2026-01-01',
    dateApproved: '2026-01-02',
    dateDelivered: '2026-01-03'
  }).length, 3);
});
test('part suggestions deduplicate case-insensitively and rank exact, prefix, substring', () => {
  assert.deepEqual(rankPartSuggestions(['Oil filter', 'FILTER', 'filter', 'Filter element', 'Seal'], 'filter'), ['filter', 'Filter element', 'Oil filter']);
  const a = {
      _id: 'a',
      createdAt: '2020-01-01',
      updatedAt: '2026-02-01'
    },
    b = {
      _id: 'b',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    };
  assert.equal([b, a].sort(updatedFirst)[0], a);
});
test('follow-up notification sends both in-app and push only to the responsible party', async () => {
  const notifications = [],
    pushes = [];
  const service = load('../utils/partsRequisitionNotificationService.js', {
    '../models/notificationModel': {
      create: async data => {
        notifications.push(data);
        return {
          _id: 'n1'
        };
      }
    },
    '../models/userModel': {},
    './mobilePushService': {
      sendPushNotificationToUsers: async data => pushes.push(data)
    }
  });
  for (const status of workflow.requisitionStatuses) await service.sendRequisitionFollowUp({
    requisition: {
      _id: 'r1',
      wrsNo: 'WRS-1',
      status,
      staff: {
        requisitionerId: 'owner'
      }
    },
    actorUserId: 'oic'
  });
  assert.equal(notifications.length, 3);
  assert.equal(pushes.length, 3);
  assert.deepEqual(notifications[0].recipientRoles, ['warehouse personnel']);
  assert.deepEqual(notifications[0].recipientUsers, []);
  assert.deepEqual(notifications[2].recipientRoles, []);
  assert.deepEqual(notifications[2].recipientUsers, ['owner']);
});
test('stock actions cannot replace request content or accept removed item states', async () => {
  const h = harness(),
    actor = user('Warehouse Personnel');
  for (const stockStatus of ['Approved', 'Ordered', 'Pending Check', 'Delivered']) assert.equal((await h.act(actor, 'stock', {
    itemId: 'i1',
    stockStatus
  })).statusCode, 400);
  assert.equal((await h.act(actor, 'stock', {
    itemId: 'missing',
    stockStatus: 'In Stock'
  })).statusCode, 400);
  assert.equal(h.writes.length, 0);
  await h.act(actor, 'stock', {
    itemId: 'i1',
    stockStatus: 'In Stock',
    status: 'Closed',
    staff: {
      requisitionerId: 'attacker'
    },
    items: [],
    confirmedAt: new Date(),
    availableQty: 999
  });
  assert.equal(h.record().status, 'Requested');
  assert.equal(h.record().staff.requisitionerId, 'owner');
  assert.equal(h.record().items.length, 2);
  assert.equal(h.record().confirmedAt, undefined);
});
test('suggestions endpoint caches distinct history and refreshes after creation', async () => {
  const h = harness();
  let reads = 0;
  h.model.distinct = async () => {
    reads++;
    return ['Filter', 'filter', 'Oil filter'];
  };
  for (const q of ['filter', 'oil']) {
    const res = response();
    await h.controller.getPartSuggestions({
      user: user('Mechanic'),
      query: {
        q
      }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
  }
  assert.equal(reads, 2);
  await h.controller.createRequisition({
    user: user('Mechanic'),
    body: {
      aircraft: 'RP-TEST',
      items: [{
        particular: 'Seal',
        quantity: 1,
        unitOfMeasure: 'PC'
      }]
    }
  }, response());
  await h.controller.getPartSuggestions({
    user: user('Mechanic'),
    query: {}
  }, response());
  assert.equal(reads, 4);
});
test('new transitions and same-status stock updates emit in-app and push notices', async () => {
  const notifications = [],
    pushes = [];
  const service = load('../utils/partsRequisitionNotificationService.js', {
    '../models/notificationModel': {
      create: async data => {
        notifications.push(data);
        return {
          _id: 'n1'
        };
      }
    },
    '../models/userModel': {},
    './mobilePushService': {
      sendPushNotificationToUsers: async data => pushes.push(data)
    }
  });
  const base = {
    _id: 'r1',
    wrsNo: 'WRS-1',
    staff: {
      requisitionerId: 'owner'
    }
  };
  for (const [previous, status] of [[null, 'Requested'], ['Requested', 'Requested'], ['Requested', 'Awaiting Stock'], ['Awaiting Stock', 'Ready for Delivery'], ['Ready for Delivery', 'Awaiting Stock'], ['Ready for Delivery', 'Delivered'], ['Delivered', 'Closed'], ['Requested', 'Cancelled']]) {
    await service.createPartsRequisitionNotifications({
      previousRequisition: previous ? {
        ...base,
        status: previous
      } : null,
      requisition: {
        ...base,
        status
      },
      actorUserId: 'actor'
    });
  }
  assert.equal(notifications.length, 8);
  assert.equal(pushes.length, 8);
  assert.equal(notifications.some(notification => notification.recipientRoles.includes('maintenance manager')), false);
  assert.ok(notifications.every(notification => notification.recipientUsers.includes('owner')));
  assert.match(notifications[5].description, /confirm receipt/);
});
test('schema accepts the new states without manufacturing available quantities', async () => {
  const Model = require('../models/partsRequisitionModel');
  const doc = new Model({
    wrsNo: 'WRS-SCHEMA',
    aircraft: 'RP-TEST',
    staff: {
      requisitioner: 'Test'
    },
    dateRequested: new Date(),
    items: [{
      itemNo: 1,
      particular: 'Filter',
      quantity: 1,
      unitOfMeasure: 'PC'
    }]
  });
  await doc.validate();
  assert.equal(doc.status, 'Requested');
  assert.equal(doc.items[0].stockStatus, 'Pending Check');
  assert.equal(doc.items[0].availableQty, undefined);
});

test('legacy ready labels never enable delivery for unchecked or unavailable items', () => {
  assert.equal(workflow.readyToDeliver({ status: 'Approved', items: [{ stockStatus: 'Out of Stock' }] }), false);
  assert.equal(workflow.readyToDeliver({ status: 'Ordered', items: [{ stockStatus: 'Parts Requested' }] }), false);
  assert.equal(workflow.readyToDeliver({ status: 'Approved', items: [{ stockStatus: 'Approved' }] }), true);
});

test('part suggestion seeds are available with an empty database and retain exact fraction characters', async () => {
  const h = harness();
  h.model.distinct = async () => [];
  const res = response();
  await h.controller.getPartSuggestions({ user: user('Mechanic'), query: { q: 'WRENCH' } }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.some(option => option.value === 'WRENCH, LOCK' && option.unit === 'ST'));
  const { PART_SUGGESTION_SEED } = require('../../shared/partSuggestionSeed.js');
  assert.equal(PART_SUGGESTION_SEED.length, 27);
  assert.ok(PART_SUGGESTION_SEED.some(part => part.name === 'WRENCH, TORQUE, ¼"DRIVE'));
  assert.ok(PART_SUGGESTION_SEED.some(part => part.name === 'WRENCH,TORQUE,⅜"DRIVE'));
  for (const part of PART_SUGGESTION_SEED) {
    const exact = response();
    await h.controller.getPartSuggestions({ user: user('Mechanic'), query: { q: part.name } }, exact);
    assert.deepEqual(exact.body[0], { value: part.name, unit: part.unit });
  }
});

test('combined seed/history suggestions rank exact, prefix, substring and attach units case-insensitively', async () => {
  const h = harness();
  h.model.distinct = async field => field === 'items.particular' ? ['wrench, lock', 'WRENCH, LOCK EXTENSION', 'CUSTOM WRENCH, LOCK HOLDER'] : [];
  const res = response();
  await h.controller.getPartSuggestions({ user: user('Mechanic'), query: { q: 'WRENCH, LOCK' } }, res);
  assert.deepEqual(res.body, [
    { value: 'wrench, lock', unit: 'ST' },
    { value: 'WRENCH, LOCK EXTENSION', unit: null },
    { value: 'CUSTOM WRENCH, LOCK HOLDER', unit: null },
  ]);
  const unknown = response();
  await h.controller.getPartSuggestions({ user: user('Mechanic'), query: { q: 'Brand new unknown part' } }, unknown);
  assert.deepEqual(unknown.body, []);
});

test('people see "Ready for Pickup" after Deliver and clearer wording for the other stages', () => {
  const labels = Object.fromEntries(workflow.requisitionStatuses.map(status => [status, workflow.statusLabel(status)]));
  assert.deepEqual(labels, {
    Requested: 'Pending Stock Check',
    'Awaiting Stock': 'Awaiting Restock',
    'Ready for Delivery': 'Stock Confirmed',
    Delivered: 'Ready for Pickup',
    Closed: 'Received',
    Cancelled: 'Cancelled',
  });
  assert.equal(workflow.statusLabel('Out of Stock'), 'Restocking');
  const delivered = { status: 'Delivered', items: [{ stockStatus: 'In Stock' }] };
  assert.equal(workflow.statusLabel(workflow.itemDisplayStatus(delivered, delivered.items[0])), 'Ready for Pickup');
  const closed = { status: 'Closed', items: [{ stockStatus: 'In Stock' }] };
  assert.equal(workflow.statusLabel(workflow.itemDisplayStatus(closed, closed.items[0])), 'Received');
  const timeline = workflow.buildTimeline({ deliveredAt: '2026-10-01T01:00:00Z', dateRequested: '2026-09-30T01:00:00Z' });
  assert.ok(timeline.some(entry => entry.label === 'Ready for pickup'));
});
