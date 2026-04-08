import React from "react";
import "../styles/CaseManagement.css";

const HearingDetailModal = ({ hearing, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h3>Hearing Details</h3>
            <p className="history-subtitle">
              {hearing.caseId?.caseNumber} — {hearing.caseId?.caseName}
            </p>
          </div>

          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="hearing-detail-body">
          <div className="hearing-detail-row">
            <strong>Hearing Date:</strong>
            <span>{new Date(hearing.hearingDate).toLocaleString()}</span>
          </div>

          <div className="hearing-detail-row">
            <strong>Status:</strong>
            <span>{hearing.hearingStatus}</span>
          </div>

          <div className="hearing-detail-row">
            <strong>Next Hearing Date:</strong>
            <span>
              {hearing.nextHearingDate
                ? new Date(hearing.nextHearingDate).toLocaleString()
                : "N/A"}
            </span>
          </div>

          <div className="hearing-detail-row vertical">
            <strong>Verdict:</strong>
            <div className="detail-box">
              {hearing.hearingVerdict || "No verdict recorded."}
            </div>
          </div>

          <div className="hearing-detail-row vertical">
            <strong>Procedural Order / Notes:</strong>
            <div className="detail-box">
              {hearing.hearingNotes || "No procedural notes recorded."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HearingDetailModal;
