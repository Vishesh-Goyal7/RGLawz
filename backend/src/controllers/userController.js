const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Case = require("../models/Case");

/**
 * Helper: remove user from all cases
 */
const unassignUserFromAllCases = async (userId, adminUserId) => {
  const cases = await Case.find({
    $or: [{ lawyerIds: userId }, { primaryLawyerId: userId }],
  });

  for (const caseDoc of cases) {
    const changes = [];

    const oldLawyerIds = [...caseDoc.lawyerIds];
    const newLawyerIds = caseDoc.lawyerIds.filter(
      (id) => id.toString() !== userId.toString()
    );

    if (
      JSON.stringify(oldLawyerIds.map(String)) !==
      JSON.stringify(newLawyerIds.map(String))
    ) {
      changes.push({
        field: "lawyerIds",
        oldValue: oldLawyerIds,
        newValue: newLawyerIds,
      });
      caseDoc.lawyerIds = newLawyerIds;
    }

    if (
      caseDoc.primaryLawyerId &&
      caseDoc.primaryLawyerId.toString() === userId.toString()
    ) {
      changes.push({
        field: "primaryLawyerId",
        oldValue: caseDoc.primaryLawyerId,
        newValue: null,
      });
      caseDoc.primaryLawyerId = null;
    }

    caseDoc.updatedBy = adminUserId;

    if (changes.length > 0) {
      caseDoc.updateHistory.push({
        updatedBy: adminUserId,
        updatedAt: new Date(),
        changes,
      });
    }

    await caseDoc.save();
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      message: "Users fetched successfully.",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Private (Admin only)
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findById(id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
      error: error.message,
    });
  }
};

/**
 * @desc    Admin creates user
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    const allowedRoles = ["admin", "junior"];
    const finalRole = allowedRoles.includes(role) ? role : "junior";

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: finalRole,
      phone: phone?.trim() || "",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create user.",
      error: error.message,
    });
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin only)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, phone, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const wasActive = user.isActive;

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Another user with this email already exists.",
        });
      }

      user.email = normalizedEmail;
    }

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();

    if (role !== undefined) {
      if (!["admin", "junior"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role.",
        });
      }
      user.role = role;
    }

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    await user.save();

    // Auto-unassign if deactivated
    if (wasActive === true && user.isActive === false) {
      await unassignUserFromAllCases(user._id, req.user._id);
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user.",
      error: error.message,
    });
  }
};

/**
 * @desc    Reset user password by admin
 * @route   PATCH /api/users/:id/reset-password
 * @access  Private (Admin only)
 */
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reset password.",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    await unassignUserFromAllCases(user._id, req.user._id);
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete user.",
      error: error.message,
    });
  }
};

/**
 * @desc    Assign lawyers to a case
 * @route   PATCH /api/users/assign-case/:caseId
 * @access  Private (Admin only)
 */
const assignLawyersToCase = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { lawyerIds, primaryLawyerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID.",
      });
    }

    if (!Array.isArray(lawyerIds)) {
      return res.status(400).json({
        success: false,
        message: "lawyerIds must be an array.",
      });
    }

    const caseDoc = await Case.findById(caseId);

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    const validUsers = await User.find({
      _id: { $in: lawyerIds },
      isActive: true,
    });

    if (validUsers.length !== lawyerIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more selected users are invalid or inactive.",
      });
    }

    if (primaryLawyerId) {
      const primaryUser = await User.findOne({
        _id: primaryLawyerId,
        isActive: true,
      });

      if (!primaryUser) {
        return res.status(400).json({
          success: false,
          message: "Primary lawyer is invalid or inactive.",
        });
      }

      if (!lawyerIds.includes(primaryLawyerId)) {
        return res.status(400).json({
          success: false,
          message: "Primary lawyer must also be included in lawyerIds.",
        });
      }
    }

    const changes = [];

    if (
      JSON.stringify(caseDoc.lawyerIds.map(String)) !==
      JSON.stringify(lawyerIds.map(String))
    ) {
      changes.push({
        field: "lawyerIds",
        oldValue: caseDoc.lawyerIds,
        newValue: lawyerIds,
      });
    }

    if (String(caseDoc.primaryLawyerId || "") !== String(primaryLawyerId || "")) {
      changes.push({
        field: "primaryLawyerId",
        oldValue: caseDoc.primaryLawyerId,
        newValue: primaryLawyerId || null,
      });
    }

    caseDoc.lawyerIds = lawyerIds;
    caseDoc.primaryLawyerId = primaryLawyerId || null;
    caseDoc.updatedBy = req.user._id;

    if (changes.length > 0) {
      caseDoc.updateHistory.push({
        updatedBy: req.user._id,
        updatedAt: new Date(),
        changes,
      });
    }

    await caseDoc.save();

    const updatedCase = await Case.findById(caseId)
      .populate("lawyerIds", "name email role")
      .populate("primaryLawyerId", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "Lawyers assigned to case successfully.",
      data: updatedCase,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to assign lawyers to case.",
      error: error.message,
    });
  }
};

/**
 * @desc    Unassign one user from one case
 * @route   PATCH /api/users/unassign-case/:caseId
 * @access  Private (Admin only)
 */
const unassignLawyerFromCase = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(caseId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID or user ID.",
      });
    }

    const caseDoc = await Case.findById(caseId);

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    const changes = [];

    const oldLawyerIds = [...caseDoc.lawyerIds];
    const newLawyerIds = caseDoc.lawyerIds.filter(
      (id) => id.toString() !== userId.toString()
    );

    if (
      JSON.stringify(oldLawyerIds.map(String)) !==
      JSON.stringify(newLawyerIds.map(String))
    ) {
      changes.push({
        field: "lawyerIds",
        oldValue: oldLawyerIds,
        newValue: newLawyerIds,
      });
      caseDoc.lawyerIds = newLawyerIds;
    }

    if (
      caseDoc.primaryLawyerId &&
      caseDoc.primaryLawyerId.toString() === userId.toString()
    ) {
      changes.push({
        field: "primaryLawyerId",
        oldValue: caseDoc.primaryLawyerId,
        newValue: null,
      });
      caseDoc.primaryLawyerId = null;
    }

    caseDoc.updatedBy = req.user._id;

    if (changes.length > 0) {
      caseDoc.updateHistory.push({
        updatedBy: req.user._id,
        updatedAt: new Date(),
        changes,
      });
    }

    await caseDoc.save();

    const updatedCase = await Case.findById(caseId)
      .populate("lawyerIds", "name email role")
      .populate("primaryLawyerId", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "User unassigned from case successfully.",
      data: updatedCase,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to unassign user from case.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  assignLawyersToCase,
  unassignLawyerFromCase,
};