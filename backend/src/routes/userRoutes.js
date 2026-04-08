const express = require("express");
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  assignLawyersToCase,
  unassignLawyerFromCase,
} = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
router.patch("/:id/reset-password", resetUserPassword);
router.delete("/:id", deleteUser);

router.patch("/assign-case/:caseId", assignLawyersToCase);
router.patch("/unassign-case/:caseId", unassignLawyerFromCase);

module.exports = router;