const mongoose = require("mongoose");

const updateHistorySchema = new mongoose.Schema(
  {
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    changes: [
      {
        field: {
          type: String,
          required: true,
        },
        oldValue: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        newValue: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
      },
    ],
  },
  { _id: false }
);

const hearingSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: [true, "Case ID is required"],
    },
    hearingDate: {
      type: Date,
      required: [true, "Hearing date is required"],
    },
    appearedBy: {
      type: String,
      trim: true,
      default: "",
    },
    hearingVerdict: {
      type: String,
      trim: true,
      default: "",
    },
    hearingNotes: {
      type: String,
      trim: true,
      default: "",
    },
    hearingStatus: {
      type: String,
      enum: ["upcoming", "done"],
      default: "upcoming",
    },
    nextHearingDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updateHistory: [updateHistorySchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Hearing", hearingSchema);