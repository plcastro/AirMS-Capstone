const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createPostInspection,
  getAllPostInspections,
  getPostInspectionById,
  updatePostInspection,
  deletePostInspection,
} = require("../controllers/postInspectionController");

router.use(verifyToken);

router.post("/createPostInspection", createPostInspection);
router.get("/getAllPostInspection", getAllPostInspections);
router.get("/getPostInspectionById/:id", getPostInspectionById);
router.put("/updatePostInspectionById/:id", updatePostInspection);
router.delete("/deletePostInspectionById/:id", deletePostInspection);

module.exports = router;
