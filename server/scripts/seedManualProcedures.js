require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const mongoose = require("mongoose");
const connectToDatabase = require("../config/db");
const ManualProcedure = require("../models/manualProcedureModel");
const {
  DEFAULT_MANUAL_PROCEDURES,
  sanitizeProcedure,
} = require("../services/aiAssessment/procedureLoader");

async function main() {
  const mongoUrl = process.env.ATLAS_URL;

  if (!mongoUrl) {
    throw new Error("ATLAS_URL is not set in server/.env.");
  }

  const procedures = DEFAULT_MANUAL_PROCEDURES.map((procedure) => ({
    ...sanitizeProcedure(procedure),
    updatedBy: "seed:procedureActionCatalog",
  })).filter((procedure) => procedure.reference);

  if (!procedures.length) {
    throw new Error("No manual procedures found to seed.");
  }

  await connectToDatabase();

  const result = await ManualProcedure.bulkWrite(
    procedures.map((procedure) => ({
      updateOne: {
        filter: { reference: procedure.reference },
        update: { $set: procedure },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  const activeProcedureCount = await ManualProcedure.countDocuments({
    active: true,
  });

  console.log(
    JSON.stringify(
      {
        source:
          "server/services/aiAssessment/procedureActionCatalog.json",
        inputProcedures: procedures.length,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        activeProceduresInDatabase: activeProcedureCount,
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
