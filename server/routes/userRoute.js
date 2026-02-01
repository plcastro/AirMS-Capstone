const express = require("express");
const router = express.Router();
const loginLimiter = require("../middleware/loginLimiter");
const {
  loginUser,
  createUser,
  getAllUser,
} = require("../controllers/userController");

router.post("/login", loginLimiter, loginUser);
router.post("/create", createUser);
router.get("/getAlluser", getAllUser);
// router.put("/update/:id", userController.updateUser);
module.exports = router;
