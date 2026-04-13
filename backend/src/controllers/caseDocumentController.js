const mongoose = require("mongoose");
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const CaseDocument = require("../models/CaseDocument");
const Case = require("../models/Case");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;

/**
 * @desc    Upload a document for a case
 * @route   POST /api/case-documents
 * @access  Private
 */
const uploadDocument = async (req, res) => {
  try {
    const { caseId, documentType, description } = req.body;
    const file = req.file;

    if (!caseId || !file) {
      return res.status(400).json({ success: false, message: "caseId and file are required." });
    }
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: "Invalid case ID." });
    }

    const linkedCase = await Case.findById(caseId);
    if (!linkedCase) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const s3Key = `cases/${caseId}/${Date.now()}-${safeName}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const doc = await CaseDocument.create({
      caseId,
      documentName: file.originalname,
      documentType: documentType || "Other",
      s3Key,
      fileSize: file.size,
      mimeType: file.mimetype,
      description: description?.trim() || "",
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    const populated = await CaseDocument.findById(doc._id)
      .populate("createdBy", "name email");

    return res.status(201).json({ success: true, message: "Document uploaded.", data: populated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to upload document.", error: error.message });
  }
};

/**
 * @desc    Get all documents for a case
 * @route   GET /api/case-documents?caseId=...
 * @access  Private
 */
const getDocuments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.caseId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.caseId)) {
        return res.status(400).json({ success: false, message: "Invalid case ID." });
      }
      filter.caseId = req.query.caseId;
    }

    const docs = await CaseDocument.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: docs.length, data: docs });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch documents.", error: error.message });
  }
};

/**
 * @desc    Get a pre-signed URL to view/download a document
 * @route   GET /api/case-documents/:id/view
 * @access  Private
 */
const getViewUrl = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid document ID." });
    }

    const doc = await CaseDocument.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found." });
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: doc.s3Key }),
      { expiresIn: 900 } // 15 minutes
    );

    return res.status(200).json({ success: true, url });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to generate view URL.", error: error.message });
  }
};

/**
 * @desc    Delete a document (admin only)
 * @route   DELETE /api/case-documents/:id
 * @access  Private (Admin)
 */
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid document ID." });
    }

    const doc = await CaseDocument.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found." });
    }

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: doc.s3Key }));
    await CaseDocument.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Document deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete document.", error: error.message });
  }
};

module.exports = { uploadDocument, getDocuments, getViewUrl, deleteDocument };
