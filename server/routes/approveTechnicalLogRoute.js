const express = require("express");
const router = express.Router();
const {
  createApproval,
  getAllApprovals,
  getApprovalById,
  updateApproval,
  deleteApproval,
} = require("../controllers/approveTechnicalLogController");

router.post("/createApproval", createApproval);
router.get("/getAllApprovals", getAllApprovals);
router.get("/getApprovalById/:id", getApprovalById);
router.put("/updateApprovalById/:id", updateApproval);
router.delete("/deleteApprovalById/:id", deleteApproval);

module.exports = router;
