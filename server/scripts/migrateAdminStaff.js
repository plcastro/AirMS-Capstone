const path = require("node:path");
const mongoose = require("mongoose");
const connectToDatabase = require("../config/db");

const isLegacyRole = (value) =>
  typeof value === "string" && value.trim().toLowerCase() === "superadmin";

// Only rename role metadata. Account identities and historical event text are
// not role fields; in particular, an email containing the old role stays valid.
const renameSnapshot = (value, field = "") => {
  if (["jobTitle", "access", "accessLevel", "role"].includes(field) && isLegacyRole(value)) {
    return "Admin Staff";
  }
  if (Array.isArray(value)) return value.map((item) => renameSnapshot(item, field));
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, renameSnapshot(item, key)]));
  }
  return value;
};

const targets = [
  { collection: "users", fields: ["jobTitle", "access"], transform: (value) => isLegacyRole(value) ? "Admin Staff" : value },
  { collection: "adminactivitylogs", fields: ["admin.accessLevel"], transform: (value) => isLegacyRole(value) ? "Admin Staff" : value },
  { collection: "adminactivitylogs", fields: ["details.previousValue", "details.newValue"], transform: (value) => isLegacyRole(value) ? "Admin Staff" : renameSnapshot(value) },
  { collection: "notifications", fields: ["recipientRoles"], transform: (value) => Array.isArray(value) ? [...new Set(value.map((role) => isLegacyRole(role) ? "admin staff" : role))] : value },
];
const getPath = (doc, field) => field.split(".").reduce((value, key) => value?.[key], doc);
const changesFor = (doc, target) => Object.fromEntries(target.fields.flatMap((field) => {
  const before = getPath(doc, field);
  const after = target.transform(before);
  return JSON.stringify(before) === JSON.stringify(after) ? [] : [[field, after]];
}));

async function migrate(db, apply = false) {
  const summary = [];
  for (const target of targets) {
    const collection = db.collection(target.collection);
    const projection = Object.fromEntries(target.fields.map((field) => [field, 1]));
    let matched = 0;
    let modified = 0;
    for await (const doc of collection.find({}, { projection })) {
      const changes = changesFor(doc, target);
      if (!Object.keys(changes).length) continue;
      matched++;
      if (apply) {
        // Compare the original fields so a concurrent account edit is not lost.
        const filter = { _id: doc._id, ...Object.fromEntries(Object.keys(changes).map((field) => [field, getPath(doc, field)])) };
        const result = await collection.updateOne(filter, { $set: changes });
        if (result.matchedCount !== 1) throw new Error("Concurrent edit detected; rerun the migration.");
        modified += result.modifiedCount;
      }
    }
    summary.push({ collection: target.collection, fields: target.fields, matched, modified });
  }
  return summary;
}

async function main() {
  require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
  const apply = process.argv.includes("--apply");
  try {
    await connectToDatabase();
    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", results: await migrate(mongoose.connection.db, apply) }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) main().catch((error) => {
  console.error(`Admin Staff migration failed (${error.name}); check database access and rerun. Connection credentials are not logged.`);
  process.exitCode = 1;
});

module.exports = { isLegacyRole, renameSnapshot, targets, changesFor, migrate };
