const fs = require("fs");
const path = require("path");

const gradlePropertiesPath = path.join(
  process.cwd(),
  "android",
  "gradle.properties",
);

if (fs.existsSync(gradlePropertiesPath)) {
  const current = fs.readFileSync(gradlePropertiesPath, "utf8");
  const next = current.includes("hermesEnabled=")
    ? current.replace(/^hermesEnabled=.*$/m, "hermesEnabled=true")
    : `${current.trimEnd()}\nhermesEnabled=true\n`;
  fs.writeFileSync(gradlePropertiesPath, next);
  console.log("Forced android/gradle.properties hermesEnabled=true");
} else {
  console.log("android/gradle.properties not found yet; Expo prebuild will generate it.");
}

const hermescPath = path.join(
  process.cwd(),
  "node_modules",
  "react-native",
  "sdks",
  "hermesc",
  "linux64-bin",
  "hermesc",
);

if (!fs.existsSync(hermescPath)) {
  console.log(`Hermes compiler not found at ${hermescPath}; skipping chmod.`);
  process.exit(0);
}

fs.chmodSync(hermescPath, 0o755);
console.log(`Marked Hermes compiler executable: ${hermescPath}`);
