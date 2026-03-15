const InspectionSchedule = require("../models/inspectionScheduleModel");
const InspectionTask = require("../models/inspectionTaskModel");


const getInspectionSchedules = async (req, res) => {
    try {
        const inspections = await InspectionSchedule.find();
        res.status(200).json(inspections);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const getInspectionScheduleById = async (req, res) => {
    try {
        const inspection = await InspectionSchedule.findById(req.params.id);

        if (!inspection) {
            return res.status(404).json({ message: "Inspection schedule not found" });
        }

        res.status(200).json(inspection);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const getTasksByInspection = async (req, res) => {
    try {
        const { inspectionName } = req.query;

        const tasks = await InspectionTask.find({
            inspectionName
        });

        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


module.exports = {
    getInspectionSchedules,
    getInspectionScheduleById,
    getTasksByInspection
};