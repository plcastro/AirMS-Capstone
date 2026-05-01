require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const mongoose = require("mongoose");
const connectToDatabase = require("../config/db");
const ManualRule = require("../models/manualRuleModel");
const {
  DEFAULT_MANUAL_RULES,
  sanitizeRule,
} = require("../services/aiAssessment/ruleLoader");

async function main() {
  const mongoUrl = process.env.ATLAS_URL;

  if (!mongoUrl) {
    throw new Error("ATLAS_URL is not set in server/.env.");
  }

  const rules = DEFAULT_MANUAL_RULES.map((rule) => ({
    ...sanitizeRule(rule),
    updatedBy: "seed:defaultRules",
  }));

  if (!rules.length) {
    throw new Error("No default maintenance rules found to seed.");
  }

  await connectToDatabase();

  const result = await ManualRule.bulkWrite(
    rules.map((rule) => ({
      updateOne: {
        filter: { ruleCode: rule.ruleCode },
        update: { $set: rule },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  const activeRuleCount = await ManualRule.countDocuments({ active: true });

  console.log(
    JSON.stringify(
      {
        source: "server/services/aiAssessment/defaultRules.js",
        inputRules: rules.length,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        activeRulesInDatabase: activeRuleCount,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
