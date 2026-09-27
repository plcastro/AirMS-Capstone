const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../../mobile/Context/NotificationContext.js"), "utf8").replace(/\r\n/g, "\n");

test("notification events share an in-flight refresh and queue a catch-up refresh", async () => {
  const start = source.indexOf("function requestRefresh(reason)");
  const end = source.indexOf(",\n    [checkModuleUpdates, fetchNotifications]", start);
  assert.ok(start >= 0 && end > start);
  let finish, requests = 0;
  const jobs = [];
  const state = {
    pendingRefreshReasonRef: { current: new Set() },
    refreshDebounceRef: { current: null },
    refreshInFlightRef: { current: false },
    refreshMountedRef: { current: true },
    fetchAbortRef: { current: null },
    AbortController,
    REFRESH_DEBOUNCE_MS: 250,
    setTimeout: (callback) => { jobs.push(callback); return jobs.length; },
    log: () => {},
    fetchNotifications: () => { requests += 1; return new Promise((resolve) => { finish = resolve; }); },
    checkModuleUpdates: async () => {},
  };
  const refresh = vm.runInNewContext(`(${source.slice(start, end)})`, state);
  refresh("ws"); refresh("fcm"); refresh("poll");
  assert.equal(jobs.length, 1);
  const pending = jobs.shift()();
  refresh("new-event-during-fetch");
  assert.equal(requests, 1);
  assert.equal(jobs.length, 0);
  assert.equal(state.fetchAbortRef.current.signal.aborted, false);
  finish(); await pending;
  assert.equal(jobs.length, 1);
  const trailing = jobs.shift()(); finish(); await trailing;
  assert.equal(requests, 2);
  assert.equal(jobs.length, 0);
  state.refreshMountedRef.current = false;
  refresh("late-event");
  assert.equal(jobs.length, 0);
});

test("notification updates retain the public refresh callback used by screen focus effects", () => {
  const start = source.indexOf("  const requestNotifications =");
  const end = source.indexOf("  return (", start);
  const memo = [];
  let index = 0;
  const useMemo = (factory, deps) => {
    const slot = index++;
    if (!memo[slot] || deps.some((dep, i) => dep !== memo[slot].deps[i])) {
      memo[slot] = { value: factory(), deps };
    }
    return memo[slot].value;
  };
  const state = {
    useMemo, useCallback: (fn, deps) => useMemo(() => fn, deps),
    scheduleRefresh: () => {}, notifications: [], unreadCount: 0, loadingNotifications: false,
    markAsRead: () => {}, markAllAsRead: () => {}, clearReadNotifications: () => {},
    openNotificationTarget: () => {}, registerPushTokenWithServer: () => {},
  };
  const render = () => {
    index = 0;
    return vm.runInNewContext(`(() => { ${source.slice(start, end)} return contextValue; })()`, state);
  };
  const before = render();
  state.notifications = [{ _id: "new", read: false }]; state.unreadCount = 1;
  const after = render();
  assert.notEqual(before, after);
  assert.equal(before.fetchNotifications, after.fetchNotifications);
});
