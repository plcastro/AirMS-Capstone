const express = require("express");
const router = express.Router();
const {
  createPostInspection,
  getAllPostInspections,
  getPostInspectionById,
  updatePostInspection,
  deletePostInspection,
} = require("../controllers/postInspectionController");

router.post("/createPostInspection", createPostInspection);
router.get("/getAllPostInspection", getAllPostInspections);
router.get("/getPostInspectionById/:id", getPostInspectionById);
router.put("/updatePostInspectionById/:id", updatePostInspection);
router.delete("/deletePostInspectionById/:id", deletePostInspection);

module.exports = router;
