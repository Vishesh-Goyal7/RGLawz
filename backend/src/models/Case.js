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

const caseSchema = new mongoose.Schema(
  {
    caseNumber: {
      type: String,
      required: [true, "Case number is required"],
      trim: true,
      unique: true,
    },
    caseName: {
      type: String,
      required: [true, "Case name is required"],
      trim: true,
    },
    petitioner: {
      type: String,
      required: [true, "Petitioner name is required"],
      trim: true,
    },
    defendant: {
      type: String,
      required: [true, "Defendant name is required"],
      trim: true,
    },
    caseDescription: {
      type: String,
      trim: true,
      default: "",
    },
    lawyerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    primaryLawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    caseStatus: {
      type: String,
      enum: ["active", "pending", "disposed", "on_hold"],
      default: "active",
    },
    nextHearingDate: {
      type: Date,
      default: null,
    },
    judgeName: {
      type: String,
      trim: true,
      default: "",
    },
    courtName: {
      type: String,
      trim: true,
      default: "",
    },
    courtLocation: {
      type: String,
      trim: true,
      default: "",
    },
    internalNotes: {
      type: String,
      trim: true,
      default: "",
    },
    latestHearingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hearing",
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

module.exports = mongoose.model("Case", caseSchema);