const test = require("node:test");
const assert = require("node:assert/strict");
const { createMessagingSync } = require("../../mobile/utilities/messagingSync");

function harness(refresh) {
  let time = 0;
  let sequence = 0;
  const jobs = new Map();
  const state = { active: true, connected: false, requests: 0, errors: 0 };
  const schedule = (fn, delay, repeat = false) => {
    const id = ++sequence;
    jobs.set(id, { fn, at: time + delay, delay, repeat });
    return id;
  };
  const sync = createMessagingSync({
    refresh: refresh || (async () => { state.requests += 1; }),
    isActive: () => state.active,
    isConnected: () => state.connected,
    onError: () => { state.errors += 1; },
    now: () => time,
    timers: {
      setTimeout: (fn, delay) => schedule(fn, delay),
      clearTimeout: (id) => jobs.delete(id),
      setInterval: (fn, delay) => schedule(fn, delay, true),
      clearInterval: (id) => jobs.delete(id),
    },
  });
  const advance = async (duration) => {
    const target = time + duration;
    for (;;) {
      const next = [...jobs].filter(([, job]) => job.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, job] = next;
      time = job.at;
      if (job.repeat) job.at += job.delay;
      else jobs.delete(id);
      job.fn();
      await Promise.resolve();
      await Promise.resolve();
    }
    time = target;
  };
  return { state, sync, advance, jobs };
}

test("Messaging polls only while active and disconnected, and stops after blur cleanup", async () => {
  const h = harness();
  await h.advance(60100);
  assert.equal(h.state.requests, 2);
  h.state.connected = true;
  await h.advance(60000);
  assert.equal(h.state.requests, 2);
  h.state.connected = false;
  h.state.active = false;
  await h.advance(60000);
  assert.equal(h.state.requests, 2);
  h.state.active = true;
  h.sync.request(); // focus/resume/reconnect explicitly catches up
  await h.advance(100);
  assert.equal(h.state.requests, 3);
  h.sync.dispose();
  h.sync.request();
  await h.advance(60000);
  assert.equal(h.state.requests, 3);
  assert.equal(h.jobs.size, 0);
});

test("Messaging combines event bursts but follows up an event received during a request", async () => {
  let complete;
  let requests = 0;
  const h = harness(() => {
    requests += 1;
    return new Promise((resolve) => { complete = resolve; });
  });
  h.sync.request(); h.sync.request(); h.sync.request();
  await h.advance(100);
  assert.equal(requests, 1);
  h.sync.request(); h.sync.request();
  await h.advance(1000);
  assert.equal(requests, 1);
  complete();
  await Promise.resolve();
  await h.advance(100);
  assert.equal(requests, 2);
  complete();
  h.sync.dispose();
});

test("Messaging aborts in-flight work and drops queued work on leaving the foreground", async () => {
  let signal;
  const h = harness((value) => {
    signal = value;
    return new Promise((resolve, reject) => value.addEventListener("abort", () => reject(new Error("aborted"))));
  });
  h.sync.request();
  await h.advance(100);
  h.sync.request();
  h.state.active = false;
  h.sync.pause();
  assert.equal(signal.aborted, true);
  await h.advance(1000);
  assert.equal(h.state.errors, 0);
  h.sync.dispose();
});

test("Messaging backs off failures rather than retrying on every event", async () => {
  let requests = 0;
  const h = harness(async () => { requests += 1; throw new Error("offline"); });
  h.sync.request();
  await h.advance(100);
  h.sync.request();
  await h.advance(9900);
  assert.equal(requests, 1);
  await h.advance(100);
  assert.equal(requests, 2);
  h.sync.dispose();
});
