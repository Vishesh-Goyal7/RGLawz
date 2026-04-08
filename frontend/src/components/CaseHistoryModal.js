import React from "react";
import "../styles/CaseManagement.css";

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return "Complex Value";
    }
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime()) && typeof value === "string") {
    const looksLikeDate =
      value.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(value);
    if (looksLikeDate) return date.toLocaleString();
  }

  return String(value);
};

const CaseHistoryModal = ({ caseData, onClose }) => {
  const history = caseData.updateHistory || [];

  return (
    <div className="modal-overlay">
      <div className="modal-card history-modal">
        <div className="modal-header">
          <div>
            <h3>Case History</h3>
            <p className="history-subtitle">
              {caseData.caseNumber} — {caseData.caseName}
            </p>
          </div>

          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="history-meta">
          <div>
            <strong>Created By:</strong> {caseData.createdBy?.name || "N/A"}
          </div>
          <div>
            <strong>Last Updated By:</strong> {caseData.updatedBy?.name || "N/A"}
          </div>
          <div>
            <strong>Created At:</strong>{" "}
            {caseData.createdAt
              ? new Date(caseData.createdAt).toLocaleString()
              : "N/A"}
          </div>
          <div>
            <strong>Last Updated At:</strong>{" "}
            {caseData.updatedAt
              ? new Date(caseData.updatedAt).toLocaleString()
              : "N/A"}
          </div>
        </div>

        {history.length === 0 ? (
          <p className="empty-text">No update history found for this case.</p>
        ) : (
          <div className="history-list">
            {[...history].reverse().map((entry, index) => (
              <div className="history-item" key={index}>
                <div className="history-item-head">
                  <div>
                    <h4>{entry.updatedBy?.name || "Unknown User"}</h4>
                    <p>
                      {entry.updatedAt
                        ? new Date(entry.updatedAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="history-changes">
                  {entry.changes?.map((change, i) => (
                    <div className="history-change-row" key={i}>
                      <div className="history-field">{change.field}</div>
                      <div className="history-values">
                        <span className="old-value">
                          {formatValue(change.oldValue)}
                        </span>
                        <span className="arrow">→</span>
                        <span className="new-value">
                          {formatValue(change.newValue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseHistoryModal;
