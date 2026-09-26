const SESSION_IDLE_LIMIT_MS = 30 * 60 * 1000;
const CLIENT_ACTIVITY_GRACE_MS = 30 * 1000;

function sessionActivityAt(session, clientValue, now = Date.now()) {
  const saved = new Date(session.lastActivityAt || session.loginAt || 0).getTime();
  const client = Number(clientValue);
  const validClient = Number.isFinite(client) && client > 0 &&
    client <= now + CLIENT_ACTIVITY_GRACE_MS;
  return Math.max(Number.isFinite(saved) ? saved : 0, validClient ? Math.min(client, now) : 0);
}

module.exports = { SESSION_IDLE_LIMIT_MS, sessionActivityAt };
