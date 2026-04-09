const mongoose = require("mongoose");
const Case = require("../models/Case");
const User = require("../models/User");

/**
 * Helper: compare fields and prepare update history
 */
const buildChangeLog = (existingCase, updates) => {
  const changes = [];

  Object.keys(updates).forEach((key) => {
    const oldValue = existingCase[key];
    const newValue = updates[key];

    const oldSerialized = JSON.stringify(oldValue ?? null);
    const newSerialized = JSON.stringify(newValue ?? null);

    if (oldSerialized !== newSerialized) {
      changes.push({
        field: key,
        oldValue,
        newValue,
      });
    }
  });

  return changes;
};

/**
 * @desc    Create a new case
 * @route   POST /api/cases
 * @access  Private
 */
const createCase = async (req, res) => {
  try {
    const {
      caseNumber,
      caseName,
      petitioner,
      defendant,
      registrationDate,
      caseDescription,
      lawyerIds,
      primaryLawyerId,
      caseStatus,
      nextHearingDate,
      judgeName,
      courtName,
      courtLocation,
      internalNotes,
    } = req.body;

    if (!caseName || !petitioner || !defendant || !registrationDate) {
      return res.status(400).json({
        success: false,
        message:
          "Case name, petitioner, defendant, and registration date are required.",
      });
    }

    const existingCase = await Case.findOne({ caseNumber: caseNumber.trim() });

    if (existingCase) {
      return res.status(409).json({
        success: false,
        message: "A case with this case number already exists.",
      });
    }

    if (lawyerIds && !Array.isArray(lawyerIds)) {
      return res.status(400).json({
        success: false,
        message: "lawyerIds must be an array.",
      });
    }

    if (lawyerIds && lawyerIds.length > 0) {
      const validLawyers = await User.find({
        _id: { $in: lawyerIds },
        isActive: true,
      });

      if (validLawyers.length !== lawyerIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more lawyer IDs are invalid or inactive.",
        });
      }
    }

    if (primaryLawyerId) {
      const primaryLawyer = await User.findOne({
        _id: primaryLawyerId,
        isActive: true,
      });

      if (!primaryLawyer) {
        return res.status(400).json({
          success: false,
          message: "Primary lawyer ID is invalid or inactive.",
        });
      }
    }

    const newCase = await Case.create({
      caseNumber: caseNumber.trim(),
      caseName: caseName.trim(),
      petitioner: petitioner.trim(),
      defendant: defendant.trim(),
      caseDescription: caseDescription?.trim() || "",
      lawyerIds: lawyerIds || [],
      registrationDate,
      primaryLawyerId: primaryLawyerId || null,
      caseStatus: caseStatus || "active",
      nextHearingDate: nextHearingDate || null,
      judgeName: judgeName?.trim() || "",
      courtName: courtName?.trim() || "",
      courtLocation: courtLocation?.trim() || "",
      internalNotes: internalNotes?.trim() || "",
      createdBy: req.user._id,
      updatedBy: req.user._id,
      updateHistory: [],
    });

    const populatedCase = await Case.findById(newCase._id)
      .populate("lawyerIds", "name email role")
      .populate("primaryLawyerId", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    return res.status(201).json({
      success: true,
      message: "Case created successfully.",
      data: populatedCase,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create case.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all cases with optional filters
 * @route   GET /api/cases
 * @access  Private
 */
const getAllCases = async (req, res) => {
  try {
    const {
      caseStatus,
      lawyerId,
      primaryLawyerId,
      courtName,
      caseNumber,
      caseName,
      petitioner,
      defendant,
      nextHearingDateFrom,
      nextHearingDateTo,
    } = req.query;

    const filter = {};

    if (caseStatus) filter.caseStatus = caseStatus;
    if (lawyerId) filter.lawyerIds = lawyerId;
    if (primaryLawyerId) filter.primaryLawyerId = primaryLawyerId;

    if (courtName) {
      filter.courtName = { $regex: courtName, $options: "i" };
    }

    if (caseNumber) {
      filter.caseNumber = { $regex: caseNumber, $options: "i" };
    }

    if (caseName) {
      filter.caseName = { $regex: caseName, $options: "i" };
    }

    if (petitioner) {
      filter.petitioner = { $regex: petitioner, $options: "i" };
    }

    if (defendant) {
      filter.defendant = { $regex: defendant, $options: "i" };
    }

    if (nextHearingDateFrom || nextHearingDateTo) {
      filter.nextHearingDate = {};
      if (nextHearingDateFrom) {
        filter.nextHearingDate.$gte = new Date(nextHearingDateFrom);
      }
      if (nextHearingDateTo) {
        filter.nextHearingDate.$lte = new Date(nextHearingDateTo);
      }
    }

    const cases = await Case.find(filter)
      .populate("lawyerIds", "name email role")
      .populate("primaryLawyerId", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: cases.length,
      message: "Cases fetched successfully.",
      data: cases,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cases.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get one case by ID
 * @route   GET /api/cases/:id
 * @access  Private
 */
const getCaseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID.",
      });
    }

    const foundCase = await Case.findById(id)
      .populate("lawyerIds", "name email role")
      .populate("primaryLawyerId", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("updateHistory.updatedBy", "name email role")
      .populate("latestHearingId");

    if (!foundCase) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Case fetched successfully.",
      data: foundCase,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch case.",
      error: error.message,
    });
  }
};

/**
 * @desc    Update a case
 * @route   PUT /api/cases/:id
 * @access  Private
 */
const updateCase = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID.",
      });
    }

    const existingCase = await Case.findById(id);

    if (!existingCase) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    const allowedFields = [
      "caseNumber",
      "caseName",
      "petitioner",
      "defendant",
      "registrationDate",
      "caseDescription",
      "caseStatus",
      "nextHearingDate",
      "judgeName",
      "courtName",
      "courtLocation",
      "internalNotes",
      "latestHearingId",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    if (updates.caseNumber) {
      const duplicateCase = await Case.findOne({
        caseNumber: updates.caseNumber.trim(),
        _id: { $ne: id },
      });

      if (duplicateCase) {
        return res.status(409).json({
          success: false,
          message: "Another case with this case number already exists.",
        });
      }

      updates.caseNumber = updates.caseNumber.trim();
    }

    if (updates.caseName) updates.caseName = updates.caseName.trim();
    if (updates.petitioner) updates.petitioner = updates.petitioner.trim();
    if (updates.defendant) updates.defendant = updates.defendant.trim();
    if (updates.caseDescription !== undefined) {
      updates.caseDescription = updates.caseDescription?.trim() || "";
    }
    if (updates.judgeName !== undefined) {
      updates.judgeName = updates.judgeName?.trim() || "";
    }
    if (updates.courtName !== undefined) {
      updates.courtName = updates.courtName?.trim() || "";
    }
    if (updates.courtLocation !== undefined) {
      updates.courtLocation = updates.courtLocation?.trim() || "";
    }
    if (updates.internalNotes !== undefined) {
      updates.internalNotes = updates.internalNotes?.trim() || "";
    }

    if (updates.lawyerIds !== undefined) {
      if (!Array.isArray(updates.lawyerIds)) {
        return res.status(400).json({
          success: false,
          message: "lawyerIds must be an array.",
        });
      }

      const validLawyers = await User.find({
        _id: { $in: updates.lawyerIds },
        isActive: true,
      });

      if (validLawyers.length !== updates.lawyerIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more lawyer IDs are invalid or inactive.",
        });
      }
    }

    if (updates.primaryLawyerId !== undefined && updates.primaryLawyerId !== null) {
      const primaryLawyer = await User.findOne({
        _id: updates.primaryLawyerId,
        isActive: true,
      });

      if (!primaryLawyer) {
        return res.status(400).json({
          success: false,
          message: "Primary lawyer ID is invalid or inactive.",
        });
      }
    }

    const changes = buildChangeLog(existingCase.toObject(), updates);

    if (changes.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes detected. Case remains unchanged.",
        data: existingCase,
      });
    }

    updates.updatedBy = req.user._id;

    const updatedCase = await Case.findByIdAndUpdate(
      id,
      {
        $set: updates,
        $push: {
          updateHistory: {
            updatedBy: req.user._id,
            updatedAt: new Date(),
            changes,
          },
        },
      },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("updateHistory.updatedBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "Case updated successfully.",
      data: updatedCase,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update case.",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a case
 * @route   DELETE /api/cases/:id
 * @access  Private (Admin only)
 */
const deleteCase = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID.",
      });
    }

    const foundCase = await Case.findById(id);

    if (!foundCase) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    await Case.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Case deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete case.",
      error: error.message,
    });
  }
};

module.exports = {
  createCase,
  getAllCases,
  getCaseById,
  updateCase,
  deleteCase,
};