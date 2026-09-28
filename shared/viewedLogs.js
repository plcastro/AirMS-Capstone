import { getLogAircraftRegistration } from './aircraftLogGroups.js';

export const viewedLogsKey = (userId, module) => userId
  ? `airms:viewed-logs:v1:${encodeURIComponent(String(userId))}:${module}` : null;
const recordId = record => String(record?._id || record?.id || '');
const stamp = record => ({
  revision: Number.isFinite(record?.__v) ? record.__v : 0,
  at: Math.max(0, ...[record?.updatedAt, record?.createdAt, record?.dateAdded].map(value => Date.parse(value) || 0)),
});
const merge = (left, right) => {
  const result = { ...left };
  for (const [id, value] of Object.entries(right)) {
    result[id] = { revision: Math.max(result[id]?.revision || 0, value.revision), at: Math.max(result[id]?.at || 0, value.at) };
  }
  return result;
};
export function parseViewedLogs(raw) {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) =>
      value && Number.isFinite(value.revision) && Number.isFinite(value.at) && value.revision >= 0 && value.at >= 0));
  } catch { return {}; }
}
export function isUnviewedLog(record, seen) {
  const id = recordId(record);
  if (!id) return false;
  const prior = Object.hasOwn(seen, id) ? seen[id] : null;
  const current = stamp(record);
  return !prior || current.revision > prior.revision || current.at > prior.at;
}
export function unviewedAircraftCounts(records, isNew) {
  const counts = new Map();
  if (!isNew) return counts;
  for (const record of records) if (isNew(record)) {
    const rpc = getLogAircraftRegistration(record);
    counts.set(rpc, (counts.get(rpc) || 0) + 1);
  }
  return counts;
}

// Adapts both synchronous localStorage and asynchronous device storage. Marks
// made during hydration are merged; writes are serialized so rapid views survive.
export function createViewedLogsStore(storage, key) {
  let snapshot = { ready: !key, seen: {} }, loading, writes = Promise.resolve();
  const listeners = new Set();
  const publish = next => { snapshot = next; listeners.forEach(listener => listener()); };
  const persist = () => {
    if (!key) return;
    const serialized = JSON.stringify(snapshot.seen);
    writes = writes.then(() => storage.setItem(key, serialized)).catch(() => {});
  };
  const load = () => {
    if (!key) return Promise.resolve();
    if (!loading) loading = Promise.resolve().then(() => storage.getItem(key)).catch(() => null).then(raw => {
      const pending = Object.keys(snapshot.seen).length > 0;
      publish({ ready: true, seen: merge(parseViewedLogs(raw), snapshot.seen) });
      if (pending) persist();
    });
    return loading;
  };
  return {
    load,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => snapshot,
    markViewed: record => {
      if (!key || !recordId(record) || !isUnviewedLog(record, snapshot.seen)) return;
      publish({ ...snapshot, seen: merge(snapshot.seen, { [recordId(record)]: stamp(record) }) });
      if (snapshot.ready) persist();
    },
    flush: async () => { await load(); await writes; },
  };
}

export function createUseViewedLogs(React, storage) {
  return function useViewedLogs(user, module) {
    const key = viewedLogsKey(user?.id || user?._id, module);
    const store = React.useMemo(() => createViewedLogsStore(storage, key), [key]);
    const snapshot = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    React.useEffect(() => { store.load(); }, [store]);
    const isNew = React.useCallback(record => Boolean(key && snapshot.ready && isUnviewedLog(record, snapshot.seen)), [key, snapshot]);
    return { isNew, markViewed: store.markViewed };
  };
}
