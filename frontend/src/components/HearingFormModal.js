import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/HearingManagement.css";

const HearingFormModal = ({ onClose, onSuccess, editingHearing, authHeaders }) => {
  const [formData, setFormData] = useState({
    caseId: "",
    hearingDate: "",
    hearingStatus: "upcoming",
    hearingVerdict: "",
    nextHearingDate: "",
    hearingNotes: "",
    updatedCaseStatus: "",
  });

  const [accessibleCases, setAccessibleCases] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line
  }, []);

  const formatForDateTimeLocal = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (editingHearing) {
      setFormData({
        caseId: editingHearing.caseId?._id || "",
        hearingDate: editingHearing.hearingDate
        ? formatForDateTimeLocal(editingHearing.hearingDate)
        : "",
        hearingStatus: editingHearing.hearingStatus || "upcoming",
        hearingVerdict: editingHearing.hearingVerdict || "",
        nextHearingDate: editingHearing.nextHearingDate
        ? formatForDateTimeLocal(editingHearing.nextHearingDate)
        : "",
        hearingNotes: editingHearing.hearingNotes || "",
        updatedCaseStatus: editingHearing.updatedCaseStatus || "",
      });
    }
  }, [editingHearing]);

  const fetchCases = async () => {
    try {
      const res = await api.get("/cases", authHeaders);
      setAccessibleCases(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch accessible cases:", error);
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
    hearingStatus: formData.hearingStatus,
    hearingVerdict: formData.hearingVerdict,
    nextHearingDate: formData.nextHearingDate || null,
    hearingNotes: formData.hearingNotes,
    updatedCaseStatus: formData.updatedCaseStatus || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

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
          <h3>{editingHearing ? "Update Hearing" : "Add Hearing"}</h3>
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
            <label>Hearing Date & Time</label>
            <input
              type="datetime-local"
              name="hearingDate"
              value={formData.hearingDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Hearing Status</label>
            <select
              name="hearingStatus"
              value={formData.hearingStatus}
              onChange={handleChange}
            >
              <option value="upcoming">Upcoming</option>
              <option value="done">Done</option>
              <option value="adjourned">Adjourned</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label>Updated Case Status</label>
            <select
              name="updatedCaseStatus"
              value={formData.updatedCaseStatus}
              onChange={handleChange}
            >
              <option value="">No Change</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="disposed">Disposed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label>Current Verdict</label>
            <textarea
              name="hearingVerdict"
              value={formData.hearingVerdict}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Next Hearing Date & Time</label>
            <input
              type="datetime-local"
              name="nextHearingDate"
              value={formData.nextHearingDate}
              onChange={handleChange}
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
                : "Create Hearing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HearingFormModal;
