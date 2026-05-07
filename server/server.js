require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const connectToDatabase = require("./config/db");
const userRoutes = require("./routes/userRoute");
const logRoutes = require("./routes/logRoute");

const maintenanceLogRoutes = require("./routes/maintenanceLogRoute");

const approveTechnicalLogRoutes = require("./routes/approveTechnicalLogRoute");
const aircraftRoutes = require("./routes/aircraftRoute");
const taskRoutes = require("./routes/taskRoute");
const inspectionRoutes = require("./routes/inspectionRoute");
const inspectionExportRoutes = require("./routes/inspectionExportRoutes");
const partsRequisitionRoutes = require("./routes/partsRequisitionRoute");
const partsMonitoringRoutes = require("./routes/partsMonitoringRoute");
const flightLogRoutes = require("./routes/flightLogRoute");
const preInspectionRoutes = require("./routes/preInspectionRoute");
const postInspectionRoutes = require("./routes/postInspectionRoute");
const notificationRoutes = require("./routes/notificationRoute");
const messageRoutes = require("./routes/messageRoute");
const adminActivityRoutes = require("./routes/adminActivityRoute");
const adminSecurityAlertRoutes = require("./routes/adminSecurityAlertRoute");
const aiInsightRoutes = require("./routes/aiInsightRoute");
const sendEmail = require("./utils/sendEmail");
const http = require("http");
const {
  startInvitationLifecycleJob,
} = require("./utils/invitationLifecycleService");
const {
  subscribeSSE,
  publishEvent,
  initWebSocket,
} = require("./utils/realtimeEvents");
const { requestContextMiddleware } = require("./middleware/requestContext");
const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8081",
  "http://localhost:8000",
  "https://airms.online",
  "https://www.airms.online", // Expo / Metro bundler origin
  "http://10.0.2.2:3000", // Android emulator (if using different port)
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-platform",
      "x-base",
      "x-session-id",
      "x-action-confirmed",
      "x-confirm-action",
    ],
    credentials: true,
  }),
);

app.get("/api/events/stream", subscribeSSE);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(requestContextMiddleware);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use((req, res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body, { replaceWith: "_" });
  }
  if (req.params) {
    mongoSanitize.sanitize(req.params, { replaceWith: "_" });
  }
  // leave req.query untouched to prevent the crash
  next();
});

connectToDatabase()
  .then(() => {
    console.log("Connected to MongoDB");
    startInvitationLifecycleJob();
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
  });

app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error("Database unavailable for request:", error.message);
    return res.status(503).json({
      status: "error",
      message: "Database connection unavailable. Please try again.",
    });
  }
});

app.use((req, res, next) => {
  res.on("finish", () => {
    const method = String(req.method || "").toUpperCase();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return;
    }

    if (res.statusCode >= 400) {
      return;
    }

    if (!String(req.originalUrl || "").startsWith("/api/")) {
      return;
    }

    publishEvent("airms:data-changed", {
      url: req.originalUrl,
      method,
      statusCode: res.statusCode,
      at: new Date().toISOString(),
    });
  });

  next();
});

app.use("/api/user", userRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/admin-activity", adminActivityRoutes);
app.use("/api/admin-security-alerts", adminSecurityAlertRoutes);
app.use("/api/parts-monitoring", partsMonitoringRoutes);
app.use("/api/parts-requisition", partsRequisitionRoutes);
app.use("/api/maintenance-logs", maintenanceLogRoutes);

app.use("/api/approve-technical-logs", approveTechnicalLogRoutes);
app.use("/api/aircraft", aircraftRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/inspections", inspectionExportRoutes);
app.use("/api/pre-inspections", preInspectionRoutes);
app.use("/api/post-inspections", postInspectionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai-insights", aiInsightRoutes);
app.use("/api/flightlogs", flightLogRoutes);
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

app.set("trust proxy", 1);

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  console.error("Error: ", err);
  if (process.env.NODE_ENV === "development") {
    return res.status(statusCode).json({
      status: "error",
      message: err.message,
      stack: err.stack,
      error: err,
    });
  } else {
    return res.status(statusCode).json({
      status: "error",
      message: "An internal error occurred",
    });
  }
});

const server = http.createServer(app);
initWebSocket(server);

if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 8000;

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
