const express = require("express");
const router = express.Router();
const {
  createComponent,
  getAllComponents,
  getComponentById,
  updateComponent,
  deleteComponent,
} = require("../controllers/componentController");

router.post("/add-component", createComponent);
router.get("/components", getAllComponents);
router.get("/get-component-by-id/:id", getComponentById);
router.put("/update-component/:id", updateComponent);
router.delete("/delete-component/:id", deleteComponent);

module.exports = router;
