const express = require("express");
const router = express.Router();
const {
  getAllRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisitionStatus,
} = require("../controllers/partsRequisitionController");

router.get("/get/all-requisition", getAllRequisitions);
router.get("/get-requisition-by-id/:id", getRequisitionById);
router.post("/create-requisition", createRequisition);
router.post("/update-requisition/:id", updateRequisitionStatus);

module.exports = router;
