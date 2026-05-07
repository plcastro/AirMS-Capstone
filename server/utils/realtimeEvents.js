const { EventEmitter } = require("events");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const bus = new EventEmitter();

// SSE clients
const sseClients = new Set();

// WebSocket server (will be initialized later)
let wss = null;
const clientsByUserId = new Map();

const addUserClient = (userId, ws) => {
  const key = String(userId);
  if (!clientsByUserId.has(key)) {
    clientsByUserId.set(key, new Set());
  }
  clientsByUserId.get(key).add(ws);
};

const removeUserClient = (userId, ws) => {
  const key = String(userId);
  const clients = clientsByUserId.get(key);
  if (!clients) return;

  clients.delete(ws);
  if (clients.size === 0) {
    clientsByUserId.delete(key);
  }
};

const getTokenFromRequest = (req) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const queryToken = url.searchParams.get("token");
    if (queryToken) return queryToken;

    const protocolHeader = req.headers["sec-websocket-protocol"];
    if (protocolHeader) {
      const protocolTokens = String(protocolHeader)
        .split(",")
        .map((value) => value.trim());
      return protocolTokens.find((value) => value && value !== "airms");
    }
  } catch {
    return null;
  }

  return null;
};

const authenticateWebSocket = (req) => {
  const token = getTokenFromRequest(req);
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("WS authentication failed:", error.message);
    return null;
  }
};

const getDecodedUserId = (decoded = {}) =>
  decoded.id || decoded._id || decoded.userId || decoded.sub || null;

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

  wss.on("connection", (ws, req) => {
    const decoded = authenticateWebSocket(req);
    const decodedUserId = getDecodedUserId(decoded);
    const userId = decodedUserId ? String(decodedUserId) : null;

    if (!userId) {
      ws.close(1008, "Unauthorized");
      return;
    }

    ws.userId = userId;
    addUserClient(userId, ws);
    ws.send(
      JSON.stringify({
        event: "connected",
        data: { userId },
      }),
    );

    console.log(`WS connected: ${userId}`);

    ws.on("close", () => {
      if (ws.userId) {
        removeUserClient(ws.userId, ws);
      }
      console.log(`WS disconnected: ${ws.userId}`);
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

const sendToUsers = (userIds = [], event, data) => {
  const payload = JSON.stringify({ event, data });
  const uniqueUserIds = [...new Set(userIds.map(String).filter(Boolean))];

  uniqueUserIds.forEach((userId) => {
    const clients = clientsByUserId.get(userId);
    if (!clients) return;

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  });
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
  sendToUsers,
};
