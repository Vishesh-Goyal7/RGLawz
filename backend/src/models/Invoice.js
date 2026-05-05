const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    clientDetailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientDetail",
      required: [true, "Client detail ID is required"],
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: [true, "Case ID is required"],
    },
    invoiceDate: {
      type: Date,
      required: [true, "Invoice date is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    status: {
      type: String,
      enum: ["Due", "Cleared", "Overdue"],
      default: "Due",
    },
    invoiceNumber: {
      type: String,
      default: null,
    },
    clientCode: {
      type: String,
      default: null,
    },
    items: {
      type: [{ particulars: { type: String }, amount: { type: Number } }],
      default: [],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // Optional attached file (e.g. PDF invoice)
    s3Key: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    mimeType: {
      type: String,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
