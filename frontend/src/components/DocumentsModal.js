import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import "../styles/DocumentsModal.css";

const DOCUMENT_TYPES = [
  "Court Order", "Petition", "Affidavit", "Notice",
  "Evidence", "Client Agreement", "Other",
];

const fmtSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDate = (d) =>
  d ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d)) : "—";

const DocumentsModal = ({ caseData, authHeaders, onClose }) => {
  const isAdmin = JSON.parse(localStorage.getItem("user") || "{}").role === "admin";

  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({ documentType: "Other", description: "" });
  const [file, setFile] = useState(null);
  const fileRef = useRef();

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/case-documents?caseId=${caseData._id}`, authHeaders);
      setDocs(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }, [caseData._id, authHeaders]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleView = async (doc) => {
    try {
      setViewingId(doc._id);
      const res = await api.get(`/case-documents/${doc._id}/view`, authHeaders);
      window.open(res.data.url, "_blank");
    } catch (err) {
      alert("Failed to get view link. Please try again.");
    } finally {
      setViewingId(null);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.documentName}"? This cannot be undone.`)) return;
    try {
      setDeletingId(doc._id);
      await api.delete(`/case-documents/${doc._id}`, authHeaders);
      setDocs((prev) => prev.filter((d) => d._id !== doc._id));
    } catch (err) {
      alert("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { alert("Please select a file."); return; }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("caseId", caseData._id);
      fd.append("documentType", form.documentType);
      fd.append("description", form.description);

      await api.post("/case-documents", fd, {
        headers: {
          ...authHeaders.headers,
          "Content-Type": "multipart/form-data",
        },
      });

      setForm({ documentType: "Other", description: "" });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await fetchDocs();
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card dm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            Documents
            <span className="dm-case-label">
              {caseData.registrationNumber ? `#${caseData.registrationNumber}` : ""}{" "}
              {caseData.caseName || `${caseData.petitioner || ""} V/S ${caseData.defendant || ""}`}
            </span>
          </h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="dm-body">
          {/* ── Document list ── */}
          <div className="dm-section-label">
            Uploaded Documents
            <span className="dm-count">{docs.length}</span>
          </div>

          {loading ? (
            <p className="dm-empty">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="dm-empty">No documents uploaded yet.</p>
          ) : (
            <table className="dm-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Size</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc._id}>
                    <td className="dm-filename">{doc.documentName}</td>
                    <td><span className="dm-type-badge">{doc.documentType}</span></td>
                    <td>{doc.description || <em className="dm-muted">—</em>}</td>
                    <td>{fmtSize(doc.fileSize)}</td>
                    <td>{doc.createdBy?.name || "—"}</td>
                    <td>{fmtDate(doc.createdAt)}</td>
                    <td>
                      <div className="dm-row-actions">
                        <button
                          className="dm-view-btn"
                          onClick={() => handleView(doc)}
                          disabled={viewingId === doc._id}
                        >
                          {viewingId === doc._id ? "…" : "View"}
                        </button>
                        {isAdmin && (
                          <button
                            className="dm-delete-btn"
                            onClick={() => handleDelete(doc)}
                            disabled={deletingId === doc._id}
                          >
                            {deletingId === doc._id ? "…" : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ── Upload form ── */}
          <div className="dm-section-label dm-upload-label">Upload New Document</div>
          <form className="dm-upload-form" onSubmit={handleUpload}>
            <div className="dm-upload-row">
              <div className="form-group">
                <label>File <span className="required-mark">*</span></label>
                <input
                  type="file"
                  ref={fileRef}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  className="dm-file-input"
                />
              </div>
              <div className="form-group">
                <label>Document Type</label>
                <select
                  value={form.documentType}
                  onChange={(e) => setForm((p) => ({ ...p, documentType: e.target.value }))}
                >
                  {DOCUMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group dm-desc-group">
                <label>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional note about this file"
                />
              </div>
              <button type="submit" className="primary-btn dm-upload-btn" disabled={uploading}>
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DocumentsModal;
