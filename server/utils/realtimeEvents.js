const { EventEmitter } = require("events");
const WebSocket = require("ws");

const bus = new EventEmitter();

// SSE clients
const sseClients = new Set();

// WebSocket server (will be initialized later)
let wss = null;

/* =========================
   SSE (Server-Sent Events)
========================= */
const subscribeSSE = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write("event: connected\ndata: {}\n\n");

  sseClients.add(res);

  const interval = setInterval(() => {
    res.write(": ping\n\n"); // keep alive
  }, 25000);

  req.on("close", () => {
    clearInterval(interval);
    sseClients.delete(res);
  });
};

/* =========================
   WebSocket
========================= */
const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("WS connected");

    ws.on("close", () => {
      console.log("WS disconnected");
    });
  });
};

const broadcast = (event, data) => {
  const payload = JSON.stringify({ event, data });

  for (const client of sseClients) {
    client.write(`event: ${event}\n`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
};

const publishEvent = (event, data) => {
  bus.emit(event, data);
};

bus.on("airms:data-changed", (data) => {
  broadcast("data-changed", data);
});

module.exports = {
  subscribeSSE,
  publishEvent,
  initWebSocket,
};
