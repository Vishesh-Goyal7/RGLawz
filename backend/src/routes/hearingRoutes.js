const express = require("express");
const {
  createHearing,
  getAllHearings,
  getHearingById,
  updateHearing,
  deleteHearing,
} = require("../controllers/hearingController");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

// All logged-in users
router.post("/", protect, createHearing);
router.get("/", protect, getAllHearings);
router.get("/:id", protect, getHearingById);
router.put("/:id", protect, updateHearing);

// Admin only
router.delete("/:id", protect, adminOnly, deleteHearing);

module.exports = router;