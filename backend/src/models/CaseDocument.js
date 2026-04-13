const mongoose = require("mongoose");

const caseDocumentSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: [true, "Case ID is required"],
    },
    documentName: {
      type: String,
      required: [true, "Document name is required"],
      trim: true,
    },
    documentType: {
      type: String,
      enum: ["Court Order", "Petition", "Affidavit", "Notice", "Evidence", "Client Agreement", "Other"],
      default: "Other",
    },
    s3Key: {
      type: String,
      required: [true, "S3 key is required"],
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: "application/octet-stream",
    },
    description: {
      type: String,
      trim: true,
      default: "",
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
  { timestamps: true }
);

module.exports = mongoose.model("CaseDocument", caseDocumentSchema);
