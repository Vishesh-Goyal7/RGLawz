const express = require("express");
const {
  registerUser,
  loginUser,
  getMe,
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

// Public route
router.post("/login", loginUser);

// Private routes
router.post("/register", protect, adminOnly, registerUser);
router.get("/me", protect, getMe);

module.exports = router;
