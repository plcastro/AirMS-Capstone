export const SESSION_IDLE_LIMIT_MS = 30 * 60 * 1000;
export const SESSION_WARNING_MINUTES = [15, 10, 5];

// Use wall-clock time so suspended apps and background tabs cannot extend a session.
export function createIdleSession({
  getLastActivity, onActivity, onWarning, onExpire,
  now = Date.now, schedule = setTimeout, cancel = clearTimeout,
}) {
  let timer;
  let stopped = false;
  let observedActivity;
  const warned = new Set();
  const check = () => {
    cancel(timer);
    if (stopped) return false;
    const lastActivity = getLastActivity();
    if (lastActivity !== observedActivity) {
      observedActivity = lastActivity;
      warned.clear();
    }
    const remaining = SESSION_IDLE_LIMIT_MS - Math.max(0, now() - lastActivity);
    if (remaining <= 0) {
      stopped = true;
      onExpire();
      return false;
    }
    const reached = SESSION_WARNING_MINUTES.filter(minutes => remaining <= minutes * 60000);
    const latest = reached.at(-1);
    if (latest && !warned.has(latest)) {
      reached.forEach(minutes => warned.add(minutes));
      onWarning(Math.ceil(remaining / 60000), { lastActivityAt: lastActivity, thresholdMinutes: latest });
    }
    const nextWarning = SESSION_WARNING_MINUTES.find(minutes => remaining > minutes * 60000);
    timer = schedule(check, nextWarning ? remaining - nextWarning * 60000 : remaining);
    return true;
  };
  return {
    check,
    activity() {
      // A first touch after expiry must not revive an expired session.
      if (!check()) return false;
      onActivity(now());
      return check();
    },
    stop() { stopped = true; cancel(timer); },
  };
}
