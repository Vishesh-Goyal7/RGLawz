import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/CaseManagement.css";

const todayISO = () => new Date().toISOString().split("T")[0];

const CaseFormModal = ({
  onClose,
  onSuccess,
  editingCase,
  authHeaders,
}) => {
  const [nextRegNumber, setNextRegNumber] = useState(null);

  const [formData, setFormData] = useState({
    caseNumber: "",
    judgeName: "",
    courtName: "",
    courtLocation: "",
    petitioner: "",
    defendant: "",
    ourClient: "petitioner",
    previousHearingDate: "",
    caseDescription: "",
    caseStatus: "active",
    nextHearingDate: "",
    internalNotes: "",
  });

  const [loading, setLoading] = useState(false);

  // For new cases, fetch next registration number
  useEffect(() => {
    if (!editingCase) {
      api
        .get("/cases/next-number", authHeaders)
        .then((res) => setNextRegNumber(res.data.data.nextNumber))
        .catch(() => setNextRegNumber("—"));
    }
  // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (editingCase) {
      setNextRegNumber(editingCase.registrationNumber ?? "—");
      setFormData({
        caseNumber: editingCase.caseNumber || "",
        judgeName: editingCase.judgeName || "",
        courtName: editingCase.courtName || "",
        courtLocation: editingCase.courtLocation || "",
        petitioner: editingCase.petitioner || "",
        defendant: editingCase.defendant || "",
        ourClient: editingCase.ourClient || "petitioner",
        previousHearingDate: editingCase.previousHearingDate
          ? new Date(editingCase.previousHearingDate).toISOString().split("T")[0]
          : "",
        registrationDate: editingCase.registrationDate
          ? new Date(editingCase.registrationDate).toISOString().split("T")[0]
          : todayISO(),
        caseDescription: editingCase.caseDescription || "",
        caseStatus: editingCase.caseStatus || "active",
        nextHearingDate: editingCase.nextHearingDate
          ? new Date(editingCase.nextHearingDate).toISOString().split("T")[0]
          : "",
        internalNotes: editingCase.internalNotes || "",
      });
    }
  }, [editingCase]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const buildCaseName = () => {
    const p = formData.petitioner.trim();
    const d = formData.defendant.trim();
    if (p && d) return `${p} V/S ${d}`;
    return p || d || "";
  };

  const buildPayload = () => ({
    caseNumber: formData.caseNumber,
    caseName: buildCaseName(),
    judgeName: formData.judgeName,
    courtName: formData.courtName,
    courtLocation: formData.courtLocation,
    petitioner: formData.petitioner,
    defendant: formData.defendant,
    ourClient: formData.ourClient,
    previousHearingDate: formData.previousHearingDate || null,
    registrationDate: editingCase
      ? editingCase.registrationDate
      : todayISO(),
    caseDescription: formData.caseDescription,
    caseStatus: formData.caseStatus,
    nextHearingDate: formData.nextHearingDate || null,
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

  const displayRegDate = editingCase
    ? (editingCase.registrationDate
        ? new Date(editingCase.registrationDate).toISOString().split("T")[0]
        : todayISO())
    : todayISO();

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
          {/* Row 1: Reg Number + Reg Date */}
          <div className="form-group">
            <label>Our Registration Number</label>
            <input
              type="text"
              value={nextRegNumber !== null ? nextRegNumber : "Loading…"}
              readOnly
              className="readonly-input"
            />
          </div>

          <div className="form-group">
            <label>Registration Date</label>
            <input
              type="date"
              value={displayRegDate}
              readOnly
              className="readonly-input"
            />
          </div>

          {/* Row 2: Judge Name + Court Room Number */}
          <div className="form-group">
            <label>Judge Name</label>
            <input
              type="text"
              name="judgeName"
              value={formData.judgeName}
              onChange={handleChange}
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

          {/* Row 3: Court Location + Court Case Number */}
          <div className="form-group">
            <label>Court Location</label>
            <input
              type="text"
              name="courtLocation"
              value={formData.courtLocation}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Court Case Number</label>
            <input
              type="text"
              name="caseNumber"
              value={formData.caseNumber}
              onChange={handleChange}
            />
          </div>

          {/* Row 4: Petitioner + Defendant */}
          <div className="form-group">
            <label>
              Petitioner
              {formData.ourClient === "petitioner" && (
                <span className="required-mark"> *</span>
              )}
            </label>
            <input
              type="text"
              name="petitioner"
              value={formData.petitioner}
              onChange={handleChange}
              required={formData.ourClient === "petitioner"}
            />
          </div>

          <div className="form-group">
            <label>
              Defendant
              {formData.ourClient === "defendant" && (
                <span className="required-mark"> *</span>
              )}
            </label>
            <input
              type="text"
              name="defendant"
              value={formData.defendant}
              onChange={handleChange}
              required={formData.ourClient === "defendant"}
            />
          </div>

          {/* Row 5: Previous Date + Our Client */}
          <div className="form-group">
            <label>Previous Date</label>
            <input
              type="date"
              name="previousHearingDate"
              value={formData.previousHearingDate}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Our Client</label>
            <select
              name="ourClient"
              value={formData.ourClient}
              onChange={handleChange}
              required
            >
              <option value="petitioner">Petitioner</option>
              <option value="defendant">Defendant</option>
            </select>
          </div>

          {/* Row 6: Case Status */}
          <div className="form-group">
            <label>Case Status</label>
            <select name="caseStatus" value={formData.caseStatus} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="decided">Decided</option>
              <option value="settlement">Settlement</option>
            </select>
          </div>

          {/* Row 7: Next Hearing Date */}
          <div className="form-group">
            <label>Next Hearing Date</label>
            <input
              type="date"
              name="nextHearingDate"
              value={formData.nextHearingDate}
              onChange={handleChange}
            />
          </div>

          <div className="form-group full-width">
            <label>Case Description</label>
            <textarea
              name="caseDescription"
              value={formData.caseDescription}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-group full-width">
            <label>Agreed Payment Terms</label>
            <textarea
              name="internalNotes"
              value={formData.internalNotes}
              onChange={handleChange}
              rows="4"
              placeholder="e.g. 50% advance, balance on disposal..."
            />
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
