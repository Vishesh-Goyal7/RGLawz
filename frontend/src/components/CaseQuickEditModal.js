import React, { useState } from "react";
import api from "../services/api";
import "../styles/CaseManagement.css";

/**
 * mode: "court"      → edit Judge Name, Court Room Number, Court Location
 * mode: "caseNumber" → edit Court Case Number
 */
const CaseQuickEditModal = ({ caseData, mode, authHeaders, onClose, onSuccess }) => {
  const [formData, setFormData] = useState(
    mode === "court"
      ? {
          judgeName: caseData.judgeName || "",
          courtName: caseData.courtName || "",
          courtLocation: caseData.courtLocation || "",
        }
      : {
          caseNumber: caseData.caseNumber || "",
        }
  );

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put(`/cases/${caseData._id}`, formData, authHeaders);
      await onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update case:", error);
      alert(error.response?.data?.message || "Failed to update case.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card quick-edit-modal">
        <div className="modal-header">
          <h3>{mode === "court" ? "Edit Court Details" : "Edit Court Case Number"}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form className="case-form-grid" onSubmit={handleSubmit}>
          {mode === "court" ? (
            <>
              <div className="form-group full-width">
                <label>
                  Judge Name <span className="required-mark">*</span>
                </label>
                <input
                  type="text"
                  name="judgeName"
                  value={formData.judgeName}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Court Room Number</label>
                <input
                  type="text"
                  name="courtName"
                  value={formData.courtName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Court Location</label>
                <input
                  type="text"
                  name="courtLocation"
                  value={formData.courtLocation}
                  onChange={handleChange}
                />
              </div>
            </>
          ) : (
            <div className="form-group full-width">
              <label>Court Case Number</label>
              <input
                type="text"
                name="caseNumber"
                value={formData.caseNumber}
                onChange={handleChange}
                autoFocus
              />
            </div>
          )}

          <div className="modal-actions full-width">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaseQuickEditModal;
