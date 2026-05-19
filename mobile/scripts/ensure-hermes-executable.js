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

const workletsBuildGradlePath = path.join(
  process.cwd(),
  "node_modules",
  "react-native-worklets",
  "android",
  "build.gradle",
);

if (fs.existsSync(workletsBuildGradlePath)) {
  const current = fs.readFileSync(workletsBuildGradlePath, "utf8");
  const next = current.replace(
    /def JS_RUNTIME = \{[\s\S]*?\}\.call\(\)/,
    'def JS_RUNTIME = "hermes"',
  );

  if (next !== current) {
    fs.writeFileSync(workletsBuildGradlePath, next);
    console.log("Forced react-native-worklets JS_RUNTIME=hermes");
  } else {
    console.log("react-native-worklets JS_RUNTIME already forced or block not found.");
  }
} else {
  console.log("react-native-worklets build.gradle not found; skipping runtime patch.");
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
