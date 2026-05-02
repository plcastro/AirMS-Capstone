const { EventEmitter } = require("events");

const realtimeBus = new EventEmitter();
const clients = new Set();

const sseHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

const pushToClient = (res, event, payload) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const subscribeToEvents = (req, res) => {
  res.writeHead(200, sseHeaders);
  res.write(": connected\n\n");

  clients.add(res);

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
};

const publishEvent = (event, payload) => {
  realtimeBus.emit(event, payload);
};

realtimeBus.on("airms:data-changed", (payload) => {
  for (const client of clients) {
    pushToClient(client, "data-changed", payload);
  }
});

module.exports = {
  subscribeToEvents,
  publishEvent,
};
