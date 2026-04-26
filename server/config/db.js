const mongoose = require("mongoose");

let hasConfiguredDns = false;
let connectionPromise = null;

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const atlasUrl = process.env.ATLAS_URL;
  if (!atlasUrl) {
    throw new Error("ATLAS_URL is not set");
  }

  if (!hasConfiguredDns) {
    try {
      require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
    } catch (error) {
      console.warn("DNS server override skipped:", error.message);
    }
    hasConfiguredDns = true;
  }

  connectionPromise = mongoose
    .connect(atlasUrl, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
    })
    .then(() => mongoose.connection)
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
};

module.exports = connectToDatabase;
