const mongoose = require("mongoose");
const Hearing = require("../models/Hearing");
const Case = require("../models/Case");

/**
 * Helper: compare fields and prepare update history
 */
const buildChangeLog = (existingHearing, updates) => {
  const changes = [];

  Object.keys(updates).forEach((key) => {
    const oldValue = existingHearing[key];
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
 * Helper: sync hearing data back into linked case
 */
const syncCaseFromHearing = async (caseId, hearingDoc, userId) => {
  const caseToUpdate = await Case.findById(caseId);
  if (!caseToUpdate) return;

  const caseUpdates = {
    latestHearingId: hearingDoc._id,
    updatedBy: userId,
  };

  if (hearingDoc.nextHearingDate !== undefined) {
    caseUpdates.nextHearingDate = hearingDoc.nextHearingDate || null;
  }

  if (hearingDoc.updatedCaseStatus) {
    caseUpdates.caseStatus = hearingDoc.updatedCaseStatus;
  }

  const caseChanges = [];

  Object.keys(caseUpdates).forEach((field) => {
    const oldValue = caseToUpdate[field];
    const newValue = caseUpdates[field];

    const oldSerialized = JSON.stringify(oldValue ?? null);
    const newSerialized = JSON.stringify(newValue ?? null);

    if (oldSerialized !== newSerialized) {
      caseChanges.push({
        field,
        oldValue,
        newValue,
      });
    }
  });

  await Case.findByIdAndUpdate(
    caseId,
    {
      $set: caseUpdates,
      ...(caseChanges.length > 0
        ? {
            $push: {
              updateHistory: {
                updatedBy: userId,
                updatedAt: new Date(),
                changes: caseChanges,
              },
            },
          }
        : {}),
    },
    { new: true, runValidators: true }
  );
};

/**
 * @desc    Create a hearing
 * @route   POST /api/hearings
 * @access  Private
 */
const createHearing = async (req, res) => {
  try {
    const {
      caseId,
      hearingDate,
      hearingVerdict,
      hearingNotes,
      hearingStatus,
      nextHearingDate,
      updatedCaseStatus,
    } = req.body;

    if (!caseId || !hearingDate) {
      return res.status(400).json({
        success: false,
        message: "caseId and hearingDate are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID.",
      });
    }

    const linkedCase = await Case.findById(caseId);
    if (!linkedCase) {
      return res.status(404).json({
        success: false,
        message: "Linked case not found.",
      });
    }

    const hearing = await Hearing.create({
      caseId,
      hearingDate,
      hearingVerdict: hearingVerdict?.trim() || "",
      hearingNotes: hearingNotes?.trim() || "",
      hearingStatus: hearingStatus || "upcoming",
      nextHearingDate: nextHearingDate || null,
      updatedCaseStatus: updatedCaseStatus || "",
      addedBy: req.user._id,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      updateHistory: [],
    });

    await syncCaseFromHearing(caseId, hearing, req.user._id);

    const populatedHearing = await Hearing.findById(hearing._id)
      .populate("caseId")
      .populate("addedBy", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    return res.status(201).json({
      success: true,
      message: "Hearing created successfully.",
      data: populatedHearing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create hearing.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all hearings with optional filters
 * @route   GET /api/hearings
 * @access  Private
 */
const getAllHearings = async (req, res) => {
  try {
    const {
      caseId,
      hearingStatus,
      updatedCaseStatus,
      hearingDateFrom,
      hearingDateTo,
      nextHearingDateFrom,
      nextHearingDateTo,
    } = req.query;

    const filter = {};

    if (caseId) filter.caseId = caseId;
    if (hearingStatus) filter.hearingStatus = hearingStatus;
    if (updatedCaseStatus) filter.updatedCaseStatus = updatedCaseStatus;

    if (hearingDateFrom || hearingDateTo) {
      filter.hearingDate = {};
      if (hearingDateFrom) filter.hearingDate.$gte = new Date(hearingDateFrom);
      if (hearingDateTo) filter.hearingDate.$lte = new Date(hearingDateTo);
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

    const hearings = await Hearing.find(filter)
      .populate("caseId")
      .populate("addedBy", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort({ hearingDate: -1, updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: hearings.length,
      message: "Hearings fetched successfully.",
      data: hearings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch hearings.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get hearing by ID
 * @route   GET /api/hearings/:id
 * @access  Private
 */
const getHearingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hearing ID.",
      });
    }

    const hearing = await Hearing.findById(id)
      .populate("caseId")
      .populate("addedBy", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("updateHistory.updatedBy", "name email role");

    if (!hearing) {
      return res.status(404).json({
        success: false,
        message: "Hearing not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hearing fetched successfully.",
      data: hearing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch hearing.",
      error: error.message,
    });
  }
};

/**
 * @desc    Update hearing
 * @route   PUT /api/hearings/:id
 * @access  Private
 */
const updateHearing = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hearing ID.",
      });
    }

    const existingHearing = await Hearing.findById(id);

    if (!existingHearing) {
      return res.status(404).json({
        success: false,
        message: "Hearing not found.",
      });
    }

    const allowedFields = [
      "caseId",
      "hearingDate",
      "hearingVerdict",
      "hearingNotes",
      "hearingStatus",
      "nextHearingDate",
      "updatedCaseStatus",
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

    if (updates.caseId) {
      if (!mongoose.Types.ObjectId.isValid(updates.caseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID.",
        });
      }

      const linkedCase = await Case.findById(updates.caseId);
      if (!linkedCase) {
        return res.status(404).json({
          success: false,
          message: "Linked case not found.",
        });
      }
    }

    if (updates.hearingVerdict !== undefined) {
      updates.hearingVerdict = updates.hearingVerdict?.trim() || "";
    }

    if (updates.hearingNotes !== undefined) {
      updates.hearingNotes = updates.hearingNotes?.trim() || "";
    }

    const changes = buildChangeLog(existingHearing.toObject(), updates);

    if (changes.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes detected. Hearing remains unchanged.",
        data: existingHearing,
      });
    }

    updates.updatedBy = req.user._id;

    const updatedHearing = await Hearing.findByIdAndUpdate(
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
      .populate("caseId")
      .populate("addedBy", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("updateHistory.updatedBy", "name email role");

    await syncCaseFromHearing(updatedHearing.caseId._id, updatedHearing, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Hearing updated successfully.",
      data: updatedHearing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update hearing.",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete hearing
 * @route   DELETE /api/hearings/:id
 * @access  Private (Admin only)
 */
const deleteHearing = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hearing ID.",
      });
    }

    const hearing = await Hearing.findById(id);

    if (!hearing) {
      return res.status(404).json({
        success: false,
        message: "Hearing not found.",
      });
    }

    await Hearing.findByIdAndDelete(id);

    const remainingLatestHearing = await Hearing.findOne({ caseId: hearing.caseId })
      .sort({ hearingDate: -1, createdAt: -1 });

    const caseUpdates = {
      latestHearingId: remainingLatestHearing ? remainingLatestHearing._id : null,
      nextHearingDate: remainingLatestHearing
        ? remainingLatestHearing.nextHearingDate || null
        : null,
      updatedBy: req.user._id,
    };

    if (remainingLatestHearing && remainingLatestHearing.updatedCaseStatus) {
      caseUpdates.caseStatus = remainingLatestHearing.updatedCaseStatus;
    }

    const linkedCase = await Case.findById(hearing.caseId);

    if (linkedCase) {
      const caseChanges = [];

      Object.keys(caseUpdates).forEach((field) => {
        const oldValue = linkedCase[field];
        const newValue = caseUpdates[field];

        const oldSerialized = JSON.stringify(oldValue ?? null);
        const newSerialized = JSON.stringify(newValue ?? null);

        if (oldSerialized !== newSerialized) {
          caseChanges.push({
            field,
            oldValue,
            newValue,
          });
        }
      });

      await Case.findByIdAndUpdate(
        hearing.caseId,
        {
          $set: caseUpdates,
          ...(caseChanges.length > 0
            ? {
                $push: {
                  updateHistory: {
                    updatedBy: req.user._id,
                    updatedAt: new Date(),
                    changes: caseChanges,
                  },
                },
              }
            : {}),
        },
        { new: true, runValidators: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Hearing deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete hearing.",
      error: error.message,
    });
  }
};

module.exports = {
  createHearing,
  getAllHearings,
  getHearingById,
  updateHearing,
  deleteHearing,
};