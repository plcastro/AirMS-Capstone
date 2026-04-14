const mongoose = require("mongoose");

let hasConfiguredDns = false;

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    return mongoose.connection.asPromise();
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

  await mongoose.connect(atlasUrl);
  return mongoose.connection;
};

module.exports = connectToDatabase;
