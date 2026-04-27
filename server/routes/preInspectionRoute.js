const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createPreInspection,
  getAllPreInspections,
  getPreInspectionById,
  updatePreInspection,
  deletePreInspection,
} = require("../controllers/preInspectionController");

router.use(verifyToken);

router.post("/createPreInspection", createPreInspection);
router.get("/getAllPreInspection", getAllPreInspections);
router.get("/getPreInspectionById/:id", getPreInspectionById);
router.put("/updatePreInspectionById/:id", updatePreInspection);
router.delete("/deletePreInspectionById/:id", deletePreInspection);

module.exports = router;
