const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getAllRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisitionStatus,
} = require("../controllers/partsRequisitionController");

router.get("/get-all-requisition", getAllRequisitions);
router.get("/get-requisition-by-id/:id", getRequisitionById);
router.post("/create-requisition", verifyToken, createRequisition);
router.post("/update-requisition/:id", verifyToken, updateRequisitionStatus);

module.exports = router;
