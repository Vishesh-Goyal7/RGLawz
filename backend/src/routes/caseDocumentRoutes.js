const express = require("express");
const multer = require("multer");
const { uploadDocument, getDocuments, getViewUrl, deleteDocument } = require("../controllers/caseDocumentController");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// /view/:id must be before /:id to avoid conflict
router.get("/:id/view", protect, getViewUrl);

router.post("/", protect, upload.single("file"), uploadDocument);
router.get("/", protect, getDocuments);
router.delete("/:id", protect, adminOnly, deleteDocument);

module.exports = router;
