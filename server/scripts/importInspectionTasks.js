require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const InspectionTask = require("../models/inspectionTaskModel");

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeTask(rawTask) {
  return {
    inspectionName: rawTask.inspectionName || "",
    aircraftModel: rawTask.aircraftModel || "",
    ata: {
      chapter: rawTask.ata?.chapter ?? 0,
      chapterName: rawTask.ata?.chapterName || "",
      section: rawTask.ata?.section ?? 0,
      sectionName: rawTask.ata?.sectionName || "",
    },
    taskId: rawTask.taskId || "",
    taskName: rawTask.taskName || "",
    component: rawTask.component || "",
    componentModel: rawTask.componentModel || "",
    inspectionType: rawTask.inspectionType || "",
    inspectionTypeFull: rawTask.inspectionTypeFull || rawTask.inspectionName || "",
    documentation: rawTask.documentation || "",
    description: rawTask.description || "",
    correctiveAction: rawTask.correctiveAction || "",
    environmentalCondition: rawTask.environmentalCondition || "",
    engineModel: rawTask.engineModel || "",
    conditions: {
      modificationStatus: rawTask.conditions?.modificationStatus || "",
      modificationNumbers: normalizeArray(rawTask.conditions?.modificationNumbers),
      effectivity: normalizeArray(rawTask.conditions?.effectivity),
    },
    interval: {
      flightHours: rawTask.interval?.flightHours ?? 0,
      calendarMonths: rawTask.interval?.calendarMonths ?? 0,
      specificInterval: rawTask.interval?.specificInterval || "",
    },
  };
}

async function main() {
  const sourcePath = process.argv[2];

  if (!sourcePath) {
    throw new Error("Usage: node scripts/importInspectionTasks.js <path-to-json-txt>");
  }

  const absolutePath = path.resolve(sourcePath);
  const fileContents = fs.readFileSync(absolutePath, "utf8");
  const parsedTasks = JSON.parse(fileContents);

  if (!Array.isArray(parsedTasks) || parsedTasks.length === 0) {
    throw new Error("Input file must contain a non-empty JSON array.");
  }

  const mongoUrl = process.env.ATLAS_URL;
  if (!mongoUrl) {
    throw new Error("ATLAS_URL is not set in the environment.");
  }

  await mongoose.connect(mongoUrl);

  const operations = parsedTasks.map((rawTask) => {
    const task = normalizeTask(rawTask);

    if (!task.taskId || !task.inspectionName || !task.aircraftModel) {
      throw new Error(
        `Task is missing required keys: ${JSON.stringify({
          taskId: task.taskId,
          inspectionName: task.inspectionName,
          aircraftModel: task.aircraftModel,
        })}`,
      );
    }

    return {
      updateOne: {
        filter: {
          taskId: task.taskId,
          inspectionName: task.inspectionName,
          aircraftModel: task.aircraftModel,
        },
        update: {
          $set: task,
        },
        upsert: true,
      },
    };
  });

  const result = await InspectionTask.bulkWrite(operations, { ordered: false });

  console.log(
    JSON.stringify(
      {
        sourcePath: absolutePath,
        totalInput: parsedTasks.length,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
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
