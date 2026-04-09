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
    registrationNumber: {
      type: Number,
      unique: true,
      required: [true, "Registration number is required"],
    },
    caseNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,   // only indexes docs where the field is actually present
    },
    caseName: {
      type: String,
      trim: true,
      default: "",
    },
    petitioner: {
      type: String,
      trim: true,
      default: "",
    },
    defendant: {
      type: String,
      trim: true,
      default: "",
    },
    ourClient: {
      type: String,
      enum: ["petitioner", "defendant"],
      required: [true, "Our client (petitioner or defendant) is required"],
    },
    registrationDate: {
      type: Date,
      default: null,
    },
    previousHearingDate: {
      type: Date,
      default: null,
    },
    caseDescription: {
      type: String,
      trim: true,
      default: "",
    },
    caseStatus: {
      type: String,
      enum: ["active", "decided", "settlement"],
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