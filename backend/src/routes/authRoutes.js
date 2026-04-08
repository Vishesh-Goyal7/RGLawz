const express = require("express");
const {
  registerUser,
  loginUser,
  getMe,
  forgotPassword
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

// Public route
router.post("/login", loginUser);

// Private routes
router.post("/register", protect, adminOnly, registerUser);
router.get("/me", protect, getMe);
router.post("/forgot-password", forgotPassword);

module.exports = router;
