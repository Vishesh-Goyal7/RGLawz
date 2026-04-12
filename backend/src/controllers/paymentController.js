const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Case = require("../models/Case");

const createPayment = async (req, res) => {
  try {
    const { caseId, date, amount, paymentMethod, notes } = req.body;

    if (!caseId || !date || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "caseId, date and amount are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: "Invalid case ID." });
    }

    const linkedCase = await Case.findById(caseId);
    if (!linkedCase) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }

    const payment = await Payment.create({
      caseId,
      date,
      amount,
      paymentMethod: paymentMethod || "Cash",
      notes: notes?.trim() || "",
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    const populated = await Payment.findById(payment._id)
      .populate("caseId", "caseNumber caseName petitioner defendant ourClient")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully.",
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create payment.",
      error: error.message,
    });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.caseId) filter.caseId = req.query.caseId;

    const payments = await Payment.find(filter)
      .populate("caseId", "caseNumber caseName petitioner defendant ourClient internalNotes")
      .populate("createdBy", "name email")
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      message: "Payments fetched successfully.",
      data: payments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments.",
      error: error.message,
    });
  }
};

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid payment ID." });
    }

    const existing = await Payment.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    const { date, amount, paymentMethod, notes } = req.body;

    const updated = await Payment.findByIdAndUpdate(
      id,
      {
        $set: {
          date: date ?? existing.date,
          amount: amount ?? existing.amount,
          paymentMethod: paymentMethod ?? existing.paymentMethod,
          notes: notes !== undefined ? notes.trim() : existing.notes,
          updatedBy: req.user._id,
        },
      },
      { new: true, runValidators: true }
    )
      .populate("caseId", "caseNumber caseName petitioner defendant ourClient internalNotes")
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Payment updated successfully.",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update payment.",
      error: error.message,
    });
  }
};

const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid payment ID." });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    await Payment.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Payment deleted successfully." });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete payment.",
      error: error.message,
    });
  }
};

module.exports = { createPayment, getAllPayments, updatePayment, deletePayment };
