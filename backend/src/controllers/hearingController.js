const mongoose = require("mongoose");
const Hearing = require("../models/Hearing");
const Case = require("../models/Case");

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

const ensureUpcomingHearingExists = async (hearingDoc, userId) => {
  if (!hearingDoc.nextHearingDate || !hearingDoc.caseId) return;

  const existingUpcoming = await Hearing.findOne({
    caseId: hearingDoc.caseId,
    hearingDate: hearingDoc.nextHearingDate,
    hearingStatus: "upcoming",
  });

  if (existingUpcoming) return;

  await Hearing.create({
    caseId: hearingDoc.caseId,
    hearingDate: hearingDoc.nextHearingDate,
    appearedBy: "",
    hearingVerdict: "",
    hearingNotes: "",
    hearingStatus: "upcoming",
    nextHearingDate: null,
    createdBy: userId,
    updatedBy: userId,
    updateHistory: [],
  });
};

const syncCaseFromHearing = async (
  caseId,
  hearingDoc,
  userId,
  finalCaseStatus = null
) => {
  const caseToUpdate = await Case.findById(caseId);
  if (!caseToUpdate) return;

  const caseUpdates = {
    latestHearingId: hearingDoc._id,
    updatedBy: userId,
  };

  if (hearingDoc.nextHearingDate) {
    caseUpdates.nextHearingDate = hearingDoc.nextHearingDate;
    caseUpdates.caseStatus = "active";
  } else {
    caseUpdates.nextHearingDate = null;
    if (finalCaseStatus) {
      caseUpdates.caseStatus = finalCaseStatus;
    }
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

const createHearing = async (req, res) => {
  try {
    const {
      caseId,
      hearingDate,
      appearedBy,
      hearingVerdict,
      hearingNotes,
      nextHearingDate,
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

    const existingHearings = await Hearing.countDocuments({ caseId });
    if (existingHearings > 0) {
      return res.status(400).json({
        success: false,
        message: "Only the first hearing can be created manually.",
      });
    }

    const hearing = await Hearing.create({
      caseId,
      hearingDate,
      appearedBy: appearedBy?.trim() || "",
      hearingVerdict: hearingVerdict?.trim() || "",
      hearingNotes: hearingNotes?.trim() || "",
      hearingStatus: nextHearingDate ? "done" : "upcoming",
      nextHearingDate: nextHearingDate || null,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      updateHistory: [],
    });

    await syncCaseFromHearing(caseId, hearing, req.user._id, null);
    await ensureUpcomingHearingExists(hearing, req.user._id);

    const populatedHearing = await Hearing.findById(hearing._id)
      .populate("caseId")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    return res.status(201).json({
      success: true,
      message: "First hearing created successfully.",
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

const getAllHearings = async (req, res) => {
  try {
    const { caseId } = req.query;

    const filter = {};
    if (caseId) filter.caseId = caseId;

    const hearings = await Hearing.find(filter)
      .populate("caseId")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort({ hearingDate: -1, createdAt: -1 });

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

const updateHearing = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      hearingDate,
      appearedBy,
      hearingVerdict,
      hearingNotes,
      nextHearingDate,
      finalCaseStatus,
    } = req.body;

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

    if (!nextHearingDate && !finalCaseStatus) {
      return res.status(400).json({
        success: false,
        message:
          "If no next hearing date is provided, you must mark the case as decided or settlement.",
      });
    }

    if (
      !nextHearingDate &&
      !["decided", "settlement"].includes(finalCaseStatus)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Final case status must be either decided or settlement when next hearing date is not provided.",
      });
    }

    const updates = {
      hearingDate: hearingDate ?? existingHearing.hearingDate,
      appearedBy:
        appearedBy !== undefined
          ? appearedBy?.trim() || ""
          : existingHearing.appearedBy,
      hearingVerdict:
        hearingVerdict !== undefined
          ? hearingVerdict?.trim() || ""
          : existingHearing.hearingVerdict,
      hearingNotes:
        hearingNotes !== undefined
          ? hearingNotes?.trim() || ""
          : existingHearing.hearingNotes,
      nextHearingDate: nextHearingDate || null,
      hearingStatus: "done",
      updatedBy: req.user._id,
    };

    const changes = buildChangeLog(existingHearing.toObject(), updates);

    const updatedHearing = await Hearing.findByIdAndUpdate(
      id,
      {
        $set: updates,
        ...(changes.length > 0
          ? {
              $push: {
                updateHistory: {
                  updatedBy: req.user._id,
                  updatedAt: new Date(),
                  changes,
                },
              },
            }
          : {}),
      },
      { new: true, runValidators: true }
    )
      .populate("caseId")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("updateHistory.updatedBy", "name email role");

    await syncCaseFromHearing(
      updatedHearing.caseId._id,
      updatedHearing,
      req.user._id,
      updates.nextHearingDate ? null : finalCaseStatus
    );

    await ensureUpcomingHearingExists(updatedHearing, req.user._id);

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