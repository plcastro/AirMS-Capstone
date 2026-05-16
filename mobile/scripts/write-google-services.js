const fs = require("fs");
const path = require("path");

const ENV_KEY = "GOOGLE_SERVICES_JSON_BASE64";
const base64Value = process.env[ENV_KEY];

if (!base64Value) {
  throw new Error(`Missing ${ENV_KEY}. Set it in EAS environment variables.`);
}

const outputPath = path.join(__dirname, "..", "google-services.json");
const fileBuffer = Buffer.from(base64Value, "base64");

if (!fileBuffer.length) {
  throw new Error(`${ENV_KEY} decoded to an empty file.`);
}

fs.writeFileSync(outputPath, fileBuffer);
console.log("google-services.json restored for EAS build.");
