// One refresh at a time, with a trailing refresh when events arrive in flight.
function createMessagingSync({
  refresh,
  isActive,
  isConnected,
  onError = () => {},
  intervalMs = 30000,
  backoffMs = 10000,
  timers = globalThis,
  now = Date.now,
}) {
  let disposed = false;
  let queued = false;
  let timeout = null;
  let controller = null;
  let pausedUntil = 0;

  const request = () => {
    if (disposed || !isActive()) return;
    if (controller) {
      queued = true;
      return;
    }
    if (timeout !== null) return;
    timeout = timers.setTimeout(run, Math.max(100, pausedUntil - now()));
  };

  const run = async () => {
    timeout = null;
    if (disposed || !isActive()) return;
    controller = new AbortController();
    try {
      await refresh(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        pausedUntil = now() + backoffMs;
        onError(error);
      }
    } finally {
      controller = null;
      if (queued) {
        queued = false;
        request();
      }
    }
  };

  const interval = timers.setInterval(() => {
    if (!isConnected()) request();
  }, intervalMs);

  const pause = () => {
    queued = false;
    if (timeout !== null) timers.clearTimeout(timeout);
    timeout = null;
    controller?.abort();
  };

  return {
    request,
    pause,
    dispose() {
      disposed = true;
      timers.clearInterval(interval);
      pause();
    },
  };
}

module.exports = { createMessagingSync };
