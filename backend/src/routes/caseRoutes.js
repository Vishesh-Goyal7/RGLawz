const express = require("express");
const {
  getNextRegistrationNumber,
  createCase,
  getAllCases,
  getCaseById,
  updateCase,
  deleteCase,
} = require("../controllers/caseController");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

// All logged-in users
router.post("/", protect, createCase);
router.get("/", protect, getAllCases);
router.get("/next-number", protect, getNextRegistrationNumber);
router.get("/:id", protect, getCaseById);
router.put("/:id", protect, updateCase);

// Admin only
router.delete("/:id", protect, adminOnly, deleteCase);

module.exports = router;