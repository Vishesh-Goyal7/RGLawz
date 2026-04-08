const mongoose = require("mongoose");

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
      enum: ["upcoming", "done", "adjourned", "cancelled"],
      default: "upcoming",
    },
    nextHearingDate: {
      type: Date,
      default: null,
    },
    updatedCaseStatus: {
      type: String,
      enum: ["active", "pending", "disposed", "on_hold", ""],
      default: "",
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Hearing", hearingSchema);