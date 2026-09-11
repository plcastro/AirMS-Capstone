const fs = require("node:fs");
const path = require("node:path");

fs.readdirSync(__dirname)
  .filter((fileName) => fileName.endsWith(".test.js"))
  .sort()
  .forEach((fileName) => require(path.join(__dirname, fileName)));
