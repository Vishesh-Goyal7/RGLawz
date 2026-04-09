import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/CaseManagement.css";

const CaseFormModal = ({
  onClose,
  onSuccess,
  editingCase,
  authHeaders,
}) => {
  const [formData, setFormData] = useState({
    caseNumber: "",
    caseName: "",
    petitioner: "",
    defendant: "",
    registrationDate: "",
    caseDescription: "",
    caseStatus: "active",
    nextHearingDate: "",
    judgeName: "",
    courtName: "",
    courtLocation: "",
    internalNotes: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingCase) {
      setFormData({
        caseNumber: editingCase.caseNumber || "",
        caseName: editingCase.caseName || "",
        petitioner: editingCase.petitioner || "",
        defendant: editingCase.defendant || "",
        registrationDate: editingCase.registrationDate
          ? new Date(editingCase.registrationDate).toISOString().split("T")[0]
          : "",
        caseDescription: editingCase.caseDescription || "",
        caseStatus: editingCase.caseStatus || "active",
        nextHearingDate: editingCase.nextHearingDate
          ? new Date(editingCase.nextHearingDate).toISOString().split("T")[0]
          : "",
        judgeName: editingCase.judgeName || "",
        courtName: editingCase.courtName || "",
        courtLocation: editingCase.courtLocation || "",
        internalNotes: editingCase.internalNotes || "",
      });
    }
  }, [editingCase]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const buildPayload = () => ({
    caseNumber: formData.caseNumber,
    caseName: formData.caseName,
    petitioner: formData.petitioner,
    defendant: formData.defendant,
    registrationDate: formData.registrationDate,
    caseDescription: formData.caseDescription,
    caseStatus: formData.caseStatus,
    nextHearingDate: formData.nextHearingDate || null,
    judgeName: formData.judgeName,
    courtName: formData.courtName,
    courtLocation: formData.courtLocation,
    internalNotes: formData.internalNotes,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (editingCase) {
        await api.put(`/cases/${editingCase._id}`, buildPayload(), authHeaders);
      } else {
        await api.post("/cases", buildPayload(), authHeaders);
      }

      await onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save case:", error);
      alert(error.response?.data?.message || "Failed to save case.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card large-modal">
        <div className="modal-header">
          <h3>{editingCase ? "Edit Case" : "Add New Case"}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="case-form-grid" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Case Number</label>
            <input type="text" name="caseNumber" value={formData.caseNumber} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Case Name</label>
            <input type="text" name="caseName" value={formData.caseName} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Petitioner</label>
            <input type="text" name="petitioner" value={formData.petitioner} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Defendant</label>
            <input type="text" name="defendant" value={formData.defendant} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Registration Date</label>
            <input type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Case Status</label>
            <select name="caseStatus" value={formData.caseStatus} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="decided">Decided</option>
              <option value="settlement">Settlement</option>
            </select>
          </div>

          <div className="form-group">
            <label>Next Hearing Date</label>
            <input type="date" name="nextHearingDate" value={formData.nextHearingDate} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Judge Name</label>
            <input type="text" name="judgeName" value={formData.judgeName} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Court Name</label>
            <input type="text" name="courtName" value={formData.courtName} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Court Location</label>
            <input type="text" name="courtLocation" value={formData.courtLocation} onChange={handleChange} />
          </div>

          <div className="form-group full-width">
            <label>Case Description</label>
            <textarea name="caseDescription" value={formData.caseDescription} onChange={handleChange} rows="3" />
          </div>

          <div className="form-group full-width">
            <label>Internal Notes</label>
            <textarea name="internalNotes" value={formData.internalNotes} onChange={handleChange} rows="3" />
          </div>

          <div className="modal-actions full-width">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving..." : editingCase ? "Update Case" : "Create Case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaseFormModal;