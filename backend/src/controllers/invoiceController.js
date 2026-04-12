const mongoose = require("mongoose");
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const Invoice = require("../models/Invoice");
const ClientDetail = require("../models/ClientDetail");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;

/**
 * @desc    Create an invoice for a client
 * @route   POST /api/invoices
 * @access  Private
 */
const createInvoice = async (req, res) => {
  try {
    const { clientDetailId, caseId, invoiceDate, amount, status, description } = req.body;
    const file = req.file; // optional

    if (!clientDetailId || !caseId || !invoiceDate || amount === undefined) {
      return res.status(400).json({ success: false, message: "clientDetailId, caseId, invoiceDate and amount are required." });
    }
    if (!mongoose.Types.ObjectId.isValid(clientDetailId)) {
      return res.status(400).json({ success: false, message: "Invalid clientDetailId." });
    }

    const client = await ClientDetail.findById(clientDetailId);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client detail not found." });
    }

    let s3Key = null;
    let fileSize = null;
    let mimeType = null;

    if (file) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      s3Key = `invoices/${clientDetailId}/${Date.now()}-${safeName}`;

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));

      fileSize = file.size;
      mimeType = file.mimetype;
    }

    const invoice = await Invoice.create({
      clientDetailId,
      caseId,
      invoiceDate: new Date(invoiceDate),
      amount: Number(amount),
      status: status || "Due",
      description: description?.trim() || "",
      s3Key,
      fileSize,
      mimeType,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    const populated = await Invoice.findById(invoice._id)
      .populate("clientDetailId", "name")
      .populate("createdBy", "name email");

    return res.status(201).json({ success: true, message: "Invoice created.", data: populated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create invoice.", error: error.message });
  }
};

/**
 * @desc    Get all invoices for a client
 * @route   GET /api/invoices?clientDetailId=...
 * @access  Private
 */
const getInvoices = async (req, res) => {
  try {
    const filter = {};
    if (req.query.clientDetailId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.clientDetailId)) {
        return res.status(400).json({ success: false, message: "Invalid clientDetailId." });
      }
      filter.clientDetailId = req.query.clientDetailId;
    }

    const invoices = await Invoice.find(filter)
      .populate("createdBy", "name email")
      .sort({ invoiceDate: -1, createdAt: -1 });

    return res.status(200).json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch invoices.", error: error.message });
  }
};

/**
 * @desc    Update invoice (status, amount, description, etc.)
 * @route   PUT /api/invoices/:id
 * @access  Private
 */
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid invoice ID." });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    const { invoiceDate, amount, status, description } = req.body;
    const updates = { updatedBy: req.user._id };

    if (invoiceDate !== undefined) updates.invoiceDate = new Date(invoiceDate);
    if (amount !== undefined) updates.amount = Number(amount);
    if (status !== undefined) updates.status = status;
    if (description !== undefined) updates.description = description.trim();

    const updated = await Invoice.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    return res.status(200).json({ success: true, message: "Invoice updated.", data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update invoice.", error: error.message });
  }
};

/**
 * @desc    Get a pre-signed URL to view an invoice file
 * @route   GET /api/invoices/:id/view
 * @access  Private
 */
const getInvoiceFileUrl = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid invoice ID." });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }
    if (!invoice.s3Key) {
      return res.status(404).json({ success: false, message: "No file attached to this invoice." });
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: invoice.s3Key }),
      { expiresIn: 900 }
    );

    return res.status(200).json({ success: true, url });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to generate view URL.", error: error.message });
  }
};

/**
 * @desc    Delete an invoice (admin only)
 * @route   DELETE /api/invoices/:id
 * @access  Private (Admin)
 */
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid invoice ID." });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    if (invoice.s3Key) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: invoice.s3Key }));
    }

    await Invoice.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Invoice deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete invoice.", error: error.message });
  }
};

module.exports = { createInvoice, getInvoices, updateInvoice, getInvoiceFileUrl, deleteInvoice };
