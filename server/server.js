require("dotenv").config();

const express = require("express");
const cors = require("cors");
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
const flightlogRoutes = require("./routes/flightlogRoute");
const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(helmet());
// app.use(xssClean());
app.use(
  mongoSanitize({
    replaceWith: "_",
    onSanitize: ({ key }) => {
      console.log(`Sanitized key: ${key}`);
    },
  }),
);

const ATLAS_URL = process.env.ATLAS_URL;
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
mongoose
  .connect(ATLAS_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
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
app.use("/uploads", express.static("uploads"));
app.use("/api/flightlogs", flightlogRoutes);

app.set("trust proxy", 1);

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;

  if (process.env.NODE_ENV === "development") {
    // In development, show the full error so you can fix it
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
