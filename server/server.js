require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoute");
const logRoutes = require("./routes/logRoute");
const defectLogRoutes = require("./routes/defectLogRoute");
const maintenanceLogRoutes = require("./routes/maintenanceLogRoute");
const technicalLogRoutes = require("./routes/technicalLogRoute");
const approveTechnicalLogRoutes = require("./routes/approveTechnicalLogRoute");
const aircraftRoutes = require("./routes/aircraftRoute");
const inventoryRoutes = require("./routes/componentRoute");
const taskRoutes = require("./routes/taskRoute");
const inspectionRoutes = require("./routes/inspectionRoute");
const preInspectionRoutes = require("./routes/preInspectionRoute");
const postInspectionRoutes = require("./routes/postInspectionRoute");
const sendEmail = require("./utilities/sendEmail");
const partsMonitoringRoutes = require('./routes/partsMonitoringRoute');
const flightlogRoutes = require("./routes/flightlogRoute");
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const ATLAS_URL = process.env.ATLAS_URL;
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
mongoose.connect(ATLAS_URL).then(() => console.log("Connected to MongoDB"));

app.use("/api/user", userRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/parts-monitoring", partsMonitoringRoutes);
app.use("/api/defect-logs", defectLogRoutes);
app.use("/api/maintenance-logs", maintenanceLogRoutes);
app.use("/api/technical-logs", technicalLogRoutes);
app.use("/api/approve-technical-logs", approveTechnicalLogRoutes);
app.use("/api/aircraft", aircraftRoutes);
app.use("/api/component-inventory", inventoryRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/pre-inspections", preInspectionRoutes);
app.use("/api/post-inspections", postInspectionRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/flightlogs", flightlogRoutes);


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
  console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
});
