const test = require('node:test');
const assert = require('node:assert/strict');
const { createViewedLogsStore, isUnviewedLog, parseViewedLogs, unviewedAircraftCounts, viewedLogsKey } = require('../../shared/viewedLogs');

const record = (changes = {}) => ({ _id: 'flight-1', rpc: 'RP-C1234', __v: 2, updatedAt: '2026-09-28T01:00:00Z', ...changes });
const memoryStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
};

test('viewing an entry survives a new store and newer revisions or timestamps become unread', async () => {
  const storage = memoryStorage();
  const key = viewedLogsKey('user-1', 'flight');
  const store = createViewedLogsStore(storage, key);
  await store.load();
  assert.equal(isUnviewedLog(record(), store.getSnapshot().seen), true);
  store.markViewed(record());
  await store.flush();
  const reopened = createViewedLogsStore(storage, key);
  await reopened.load();
  const seen = reopened.getSnapshot().seen;
  assert.equal(isUnviewedLog(record(), seen), false);
  assert.equal(isUnviewedLog(record({ __v: 3 }), seen), true);
  assert.equal(isUnviewedLog(record({ updatedAt: '2026-09-28T02:00:00Z' }), seen), true);
  assert.equal(isUnviewedLog(record({ __v: 1, updatedAt: '2026-09-27T01:00:00Z' }), seen), false);
});

test('accounts and log types keep independent viewed histories', async () => {
  const storage = memoryStorage();
  const first = createViewedLogsStore(storage, viewedLogsKey('user-1', 'flight'));
  first.markViewed(record());
  await first.flush();
  for (const key of [viewedLogsKey('user-2', 'flight'), viewedLogsKey('user-1', 'pre'), viewedLogsKey('user-1', 'post')]) {
    const other = createViewedLogsStore(storage, key);
    await other.load();
    assert.equal(isUnviewedLog(record(), other.getSnapshot().seen), true);
  }
});

test('a view during slow storage hydration merges with previously viewed entries', async () => {
  let resolveRead;
  const storage = memoryStorage();
  const originalGet = storage.getItem;
  storage.getItem = () => new Promise(resolve => { resolveRead = resolve; });
  const store = createViewedLogsStore(storage, 'seen');
  const loading = store.load();
  await Promise.resolve();
  assert.equal(store.getSnapshot().ready, false);
  store.markViewed(record());
  resolveRead(JSON.stringify({ old: { revision: 4, at: 1 } }));
  await loading;
  await store.flush();
  assert.equal(store.getSnapshot().ready, true);
  const saved = parseViewedLogs(originalGet('seen'));
  assert.equal(isUnviewedLog(record(), saved), false);
  assert.equal(saved.old.revision, 4);
});

test('rapid views serialize asynchronous storage writes without losing entries', async () => {
  let finishFirstWrite;
  const writes = [];
  const store = createViewedLogsStore({
    getItem: () => null,
    setItem: async (key, value) => {
      writes.push(value);
      if (writes.length === 1) await new Promise(resolve => { finishFirstWrite = resolve; });
    },
  }, 'seen');
  await store.load();
  store.markViewed(record());
  await Promise.resolve();
  store.markViewed(record({ _id: 'flight-2' }));
  assert.equal(writes.length, 1);
  finishFirstWrite();
  await store.flush();
  assert.equal(writes.length, 2);
  assert.deepEqual(Object.keys(parseViewedLogs(writes[1])).sort(), ['flight-1', 'flight-2']);
});

test('viewing a stale response does not reduce the latest viewed stamp', async () => {
  const store = createViewedLogsStore(memoryStorage(), 'seen');
  await store.load();
  const latest = record({ __v: 10, updatedAt: '2026-09-28T03:00:00Z' });
  store.markViewed(latest);
  store.markViewed(record());
  assert.equal(isUnviewedLog(latest, store.getSnapshot().seen), false);
});

test('aircraft counts clear only the viewed entry and normalize registration', async () => {
  const store = createViewedLogsStore(memoryStorage(), 'seen');
  await store.load();
  const entries = [record(), record({ _id: 'flight-2', rpc: ' rp-c1234 ' }), record({ _id: 'flight-3', rpc: 'RP-C9999' })];
  const counts = () => unviewedAircraftCounts(entries, entry => isUnviewedLog(entry, store.getSnapshot().seen));
  assert.equal(counts().get('RP-C1234'), 2);
  store.markViewed(entries[0]);
  assert.equal(counts().get('RP-C1234'), 1);
  assert.equal(counts().get('RP-C9999'), 1);
  store.markViewed(entries[1]);
  assert.equal(counts().has('RP-C1234'), false);
});

test('unavailable or corrupted storage keeps the feature usable in memory', async () => {
  assert.deepEqual(parseViewedLogs('invalid json'), {});
  assert.deepEqual(parseViewedLogs('[1,2]'), {});
  assert.deepEqual(parseViewedLogs('{"bad":{"revision":"1","at":0},"good":{"revision":0,"at":1}}'), { good: { revision: 0, at: 1 } });
  const store = createViewedLogsStore({ getItem: () => { throw Error('unavailable'); }, setItem: async () => { throw Error('full'); } }, 'seen');
  await store.load();
  store.markViewed(record());
  await store.flush();
  assert.equal(isUnviewedLog(record(), store.getSnapshot().seen), false);
});

test('anonymous sessions and records without IDs never write viewed state', async () => {
  const storage = { getItem: () => assert.fail('must not read'), setItem: () => assert.fail('must not write') };
  assert.equal(viewedLogsKey(null, 'flight'), null);
  const store = createViewedLogsStore(storage, null);
  store.markViewed(record());
  await store.flush();
  assert.deepEqual(store.getSnapshot(), { ready: true, seen: {} });
  assert.equal(isUnviewedLog(undefined, {}), false);
});
