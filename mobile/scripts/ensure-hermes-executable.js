const fs = require("fs");
const path = require("path");

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
