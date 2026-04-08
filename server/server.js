require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const mongoose = require("mongoose");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
// const xssClean = require("xss-clean");
const userRoutes = require("./routes/userRoute");
const logRoutes = require("./routes/logRoute");
const defectLogRoutes = require("./routes/defectLogRoute");
const maintenanceLogRoutes = require("./routes/maintenanceLogRoute");
const technicalLogRoutes = require("./routes/technicalLogRoute");
const approveTechnicalLogRoutes = require("./routes/approveTechnicalLogRoute");
const aircraftRoutes = require("./routes/aircraftRoute");
const taskRoutes = require("./routes/taskRoute");
const inspectionRoutes = require("./routes/inspectionRoute");
const partsRequisitionRoutes = require("./routes/partsRequisitionRoute");
const partsMonitoringRoutes = require("./routes/partsMonitoringRoute");
const flightLogRoutes = require("./routes/flightLogRoute");
const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8000",
  "https://airms.online",
  "https://www.airms.online",
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
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

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
  // We leave req.query untouched to prevent the crash
  next();
});

const ATLAS_URL = process.env.ATLAS_URL;
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
mongoose
  .connect(ATLAS_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
  });

app.use("/api/user", userRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/parts-monitoring", partsMonitoringRoutes);
app.use("/api/parts-requisition", partsRequisitionRoutes);
app.use("/api/defect-logs", defectLogRoutes);
app.use("/api/maintenance-logs", maintenanceLogRoutes);
app.use("/api/technical-logs", technicalLogRoutes);
app.use("/api/approve-technical-logs", approveTechnicalLogRoutes);
app.use("/api/aircraft", aircraftRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);
app.use("/api/flightlogs", flightLogRoutes);

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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
  console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
});
