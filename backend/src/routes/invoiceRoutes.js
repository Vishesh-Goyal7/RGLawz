const express = require("express");
const multer = require("multer");
const { createInvoice, getInvoices, updateInvoice, getInvoiceFileUrl, deleteInvoice } = require("../controllers/invoiceController");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// /view route before /:id to avoid conflict
router.get("/:id/view", protect, getInvoiceFileUrl);

router.post("/", protect, upload.single("file"), createInvoice);
router.get("/", protect, getInvoices);
router.put("/:id", protect, updateInvoice);
router.delete("/:id", protect, adminOnly, deleteInvoice);

module.exports = router;
