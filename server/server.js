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
const sendEmail = require("./utilities/sendEmail");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ATLAS_URL = process.env.ATLAS_URL;
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
mongoose.connect(ATLAS_URL).then(() => console.log("Connected to MongoDB"));

app.use("/api/user", userRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/defect-logs", defectLogRoutes);
app.use("/api/maintenance-logs", maintenanceLogRoutes);
app.use("/api/technical-logs", technicalLogRoutes);
app.use("/api/approve-technical-logs", approveTechnicalLogRoutes);
app.use("/aircraft", aircraftRoutes);
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
  console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
});
