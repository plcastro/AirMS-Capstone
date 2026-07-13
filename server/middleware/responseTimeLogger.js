const formatDurationMs = (startTime) => {
  const durationNs = process.hrtime.bigint() - startTime;
  return Number(durationNs) / 1_000_000;
};

const responseTimeLogger = (req, res, next) => {
  if (!String(req.originalUrl || req.url || "").startsWith("/api/")) {
    return next();
  }

  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = formatDurationMs(startTime);
    const roundedDuration = durationMs.toFixed(1);
    const method = String(req.method || "").toUpperCase();
    const url = req.originalUrl || req.url || "";

    console.log(
      `[API] ${method} ${url} ${res.statusCode} ${roundedDuration}ms`,
    );
  });

  const originalWriteHead = res.writeHead;
  res.writeHead = function writeHeadWithResponseTime(...args) {
    if (!res.headersSent) {
      const durationMs = formatDurationMs(startTime);
      const roundedDuration = durationMs.toFixed(1);
      res.setHeader("X-Response-Time", `${roundedDuration}ms`);
      res.setHeader("Server-Timing", `app;dur=${roundedDuration}`);
    }

    return originalWriteHead.apply(this, args);
  };

  next();
};

module.exports = { responseTimeLogger };
