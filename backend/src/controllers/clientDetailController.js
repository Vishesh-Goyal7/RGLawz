const mongoose = require("mongoose");
const ClientDetail = require("../models/ClientDetail");

/**
 * @desc    Create client detail for a case
 * @route   POST /api/client-details
 * @access  Private
 */
const createClientDetail = async (req, res) => {
  try {
    const { caseId, name, email, phone, address } = req.body;

    if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: "Valid caseId is required." });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Client name is required." });
    }

    // Upsert: if a record already exists for this case, update it
    const detail = await ClientDetail.findOneAndUpdate(
      { caseId },
      {
        $set: {
          name: name.trim(),
          email: email?.trim() || "",
          phone: phone?.trim() || "",
          address: address?.trim() || "",
          updatedBy: req.user._id,
        },
        $setOnInsert: { createdBy: req.user._id },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(201).json({ success: true, data: detail });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to save client detail.", error: error.message });
  }
};

/**
 * @desc    Get all client details (populated with case info)
 * @route   GET /api/client-details
 * @access  Private
 */
const getAllClientDetails = async (req, res) => {
  try {
    const details = await ClientDetail.find()
      .populate({
        path: "caseId",
        select: "registrationNumber caseNumber petitioner defendant ourClient courtName judgeName caseStatus nextHearingDate previousHearingDate caseName",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: details.length, data: details });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch client details.", error: error.message });
  }
};

/**
 * @desc    Get client detail by case ID
 * @route   GET /api/client-details/case/:caseId
 * @access  Private
 */
const getClientDetailByCaseId = async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: "Invalid case ID." });
    }

    const detail = await ClientDetail.findOne({ caseId });

    if (!detail) {
      return res.status(404).json({ success: false, message: "No client detail found for this case." });
    }

    return res.status(200).json({ success: true, data: detail });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch client detail.", error: error.message });
  }
};

/**
 * @desc    Update client detail by ID
 * @route   PUT /api/client-details/:id
 * @access  Private
 */
const updateClientDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID." });
    }

    const { name, email, phone, address } = req.body;
    const updates = { updatedBy: req.user._id };

    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (address !== undefined) updates.address = address.trim();

    const detail = await ClientDetail.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!detail) {
      return res.status(404).json({ success: false, message: "Client detail not found." });
    }

    return res.status(200).json({ success: true, data: detail });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update client detail.", error: error.message });
  }
};

/**
 * @desc    Update client detail by case ID
 * @route   PUT /api/client-details/case/:caseId
 * @access  Private
 */
const updateClientDetailByCaseId = async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: "Invalid case ID." });
    }

    const { name, email, phone, address } = req.body;
    const updates = { updatedBy: req.user._id };

    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (address !== undefined) updates.address = address.trim();

    const detail = await ClientDetail.findOneAndUpdate(
      { caseId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!detail) {
      return res.status(404).json({ success: false, message: "Client detail not found for this case." });
    }

    return res.status(200).json({ success: true, data: detail });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update client detail.", error: error.message });
  }
};

module.exports = {
  createClientDetail,
  getAllClientDetails,
  getClientDetailByCaseId,
  updateClientDetail,
  updateClientDetailByCaseId,
};
