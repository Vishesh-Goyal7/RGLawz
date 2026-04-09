import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/HearingManagement.css";

const formatForDateInput = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const HearingFormModal = ({ onClose, onSuccess, editingHearing, authHeaders }) => {
  const [formData, setFormData] = useState({
    caseId: "",
    hearingDate: "",
    appearedBy: "",
    hearingVerdict: "",
    nextHearingDate: "",
    hearingNotes: "",
    finalCaseStatus: "",
  });

  const [accessibleCases, setAccessibleCases] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (editingHearing) {
      setFormData({
        caseId: editingHearing.caseId?._id || "",
        hearingDate: editingHearing.hearingDate
          ? formatForDateInput(editingHearing.hearingDate)
          : "",
        appearedBy: editingHearing.appearedBy || "",
        hearingVerdict: editingHearing.hearingVerdict || "",
        nextHearingDate: editingHearing.nextHearingDate
          ? formatForDateInput(editingHearing.nextHearingDate)
          : "",
        hearingNotes: editingHearing.hearingNotes || "",
        finalCaseStatus: "",
      });
    }
  }, [editingHearing]);

  const fetchCases = async () => {
    try {
      const res = await api.get("/cases", authHeaders);
      setAccessibleCases(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch cases:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const buildPayload = () => ({
    caseId: formData.caseId,
    hearingDate: formData.hearingDate,
    appearedBy: formData.appearedBy,
    hearingVerdict: formData.hearingVerdict,
    nextHearingDate: formData.nextHearingDate || null,
    hearingNotes: formData.hearingNotes,
    finalCaseStatus: formData.nextHearingDate ? null : formData.finalCaseStatus,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (!formData.nextHearingDate && !formData.finalCaseStatus) {
        alert("If no next hearing date is entered, select Decided or Settlement.");
        return;
      }

      if (editingHearing) {
        await api.put(
          `/hearings/${editingHearing._id}`,
          buildPayload(),
          authHeaders
        );
      } else {
        await api.post("/hearings", buildPayload(), authHeaders);
      }

      await onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save hearing:", error);
      alert(error.response?.data?.message || "Failed to save hearing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card large-modal">
        <div className="modal-header">
          <h3>{editingHearing ? "Update Hearing" : "Add First Hearing"}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="hearing-form-grid" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Case</label>
            <select
              name="caseId"
              value={formData.caseId}
              onChange={handleChange}
              required
              disabled={!!editingHearing}
            >
              <option value="">Select Case</option>
              {accessibleCases.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.caseNumber} — {item.caseName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Hearing Date</label>
            <input
              type="date"
              name="hearingDate"
              value={formData.hearingDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Lawyer on Date</label>
            <input
              type="text"
              name="appearedBy"
              value={formData.appearedBy}
              onChange={handleChange}
              placeholder="Who handled this date?"
              required={!!editingHearing}
            />
          </div>

          <div className="form-group">
            <label>Next Hearing Date</label>
            <input
              type="date"
              name="nextHearingDate"
              value={formData.nextHearingDate}
              onChange={handleChange}
            />
          </div>

          {!formData.nextHearingDate && (
            <div className="form-group">
              <label>Case Result</label>
              <select
                name="finalCaseStatus"
                value={formData.finalCaseStatus}
                onChange={handleChange}
              >
                <option value="">Select Result</option>
                <option value="decided">Decided</option>
                <option value="settlement">Settlement</option>
              </select>
            </div>
          )}

          <div className="form-group full-width">
            <label>Verdict</label>
            <textarea
              name="hearingVerdict"
              value={formData.hearingVerdict}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-group full-width">
            <label>Procedural Order</label>
            <textarea
              name="hearingNotes"
              value={formData.hearingNotes}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="modal-actions full-width">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading
                ? "Saving..."
                : editingHearing
                ? "Update Hearing"
                : "Create First Hearing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HearingFormModal;