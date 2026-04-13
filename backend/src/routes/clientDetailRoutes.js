const express = require("express");
const {
  createClientDetail,
  getAllClientDetails,
  getClientDetailByCaseId,
  updateClientDetail,
  updateClientDetailByCaseId,
} = require("../controllers/clientDetailController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// /case/:caseId must be declared before /:id to avoid route conflicts
router.get("/case/:caseId", protect, getClientDetailByCaseId);
router.put("/case/:caseId", protect, updateClientDetailByCaseId);

router.post("/", protect, createClientDetail);
router.get("/", protect, getAllClientDetails);
router.put("/:id", protect, updateClientDetail);

module.exports = router;
