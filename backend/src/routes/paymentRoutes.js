const express = require("express");
const {
  createPayment,
  getAllPayments,
  updatePayment,
  deletePayment,
} = require("../controllers/paymentController");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

router.post("/", protect, createPayment);
router.get("/", protect, getAllPayments);
router.put("/:id", protect, updatePayment);
router.delete("/:id", protect, adminOnly, deletePayment);

module.exports = router;
