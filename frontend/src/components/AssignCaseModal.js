import React, { useMemo, useState } from "react";
import api from "../services/api";
import "../styles/UserManagement.css";

const AssignCaseModal = ({
  onClose,
  onSuccess,
  selectedUser,
  cases,
  authHeaders,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [makePrimary, setMakePrimary] = useState(true);
  const [loading, setLoading] = useState(false);

  const assignedCases = useMemo(() => {
    return cases.filter((c) =>
      (c.lawyerIds || []).some((lawyer) => lawyer._id === selectedUser._id)
    );
  }, [cases, selectedUser._id]);

  const unassignedCases = useMemo(() => {
    return cases.filter(
      (c) => !(c.lawyerIds || []).some((lawyer) => lawyer._id === selectedUser._id)
    );
  }, [cases, selectedUser._id]);

  const handleAssign = async () => {
    if (!selectedCaseId) {
      alert("Please select a case.");
      return;
    }

    try {
      setLoading(true);

      const caseDoc = cases.find((c) => c._id === selectedCaseId);
      if (!caseDoc) {
        alert("Selected case not found.");
        return;
      }

      const existingLawyerIds = (caseDoc.lawyerIds || []).map((l) => l._id);
      const uniqueLawyerIds = Array.from(
        new Set([...existingLawyerIds, selectedUser._id])
      );

      await api.patch(
        `/users/assign-case/${selectedCaseId}`,
        {
          lawyerIds: uniqueLawyerIds,
          primaryLawyerId: makePrimary
            ? selectedUser._id
            : caseDoc.primaryLawyerId?._id || null,
        },
        authHeaders
      );

      await onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to assign case.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (caseId) => {
    const confirmed = window.confirm(
      "Are you sure you want to unassign this user from the selected case?"
    );
    if (!confirmed) return;

    try {
      setLoading(true);

      await api.patch(
        `/users/unassign-case/${caseId}`,
        { userId: selectedUser._id },
        authHeaders
      );

      await onSuccess();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to unassign case.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Manage Cases for {selectedUser.name}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="assign-case-body">
          <div className="assign-section">
            <h4>Already Assigned Cases</h4>
            {assignedCases.length === 0 ? (
              <p className="empty-text">No assigned cases yet.</p>
            ) : (
              <div className="assigned-case-grid">
                {assignedCases.map((c) => (
                  <div className="assigned-case-card" key={c._id}>
                    <div>
                      <strong>{c.caseNumber}</strong>
                      <p>{c.caseName}</p>
                    </div>

                    <button
                      className="danger-btn"
                      onClick={() => handleUnassign(c._id)}
                      disabled={loading}
                    >
                      Unassign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="assign-section">
            <h4>Assign New Case</h4>

            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
            >
              <option value="">Select a case</option>
              {unassignedCases.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.caseNumber} — {c.caseName}
                </option>
              ))}
            </select>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={makePrimary}
                onChange={(e) => setMakePrimary(e.target.checked)}
              />
              Make this user the primary lawyer for the selected case
            </label>

            <div className="modal-actions">
              <button className="secondary-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="primary-btn"
                onClick={handleAssign}
                disabled={loading}
              >
                {loading ? "Processing..." : "Assign Case"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignCaseModal;