import React from "react";
import "../styles/CaseManagement.css";

const formatISTDate = (dateValue) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateValue));

const formatISTDateTime = (dateValue) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(dateValue));

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
            <span>{formatISTDate(hearing.hearingDate)}</span>
          </div>

          <div className="hearing-detail-row">
            <strong>Status:</strong>
            <span>{hearing.hearingStatus}</span>
          </div>

          <div className="hearing-detail-row">
            <strong>Lawyer on Date:</strong>
            <span>{hearing.appearedBy || "N/A"}</span>
          </div>

          <div className="hearing-detail-row">
            <strong>Next Hearing Date:</strong>
            <span>
              {hearing.nextHearingDate
                ? formatISTDate(hearing.nextHearingDate)
                : "N/A"}
            </span>
          </div>

          <div className="hearing-detail-row">
            <strong>Created At:</strong>
            <span>{formatISTDateTime(hearing.createdAt)}</span>
          </div>

          <div className="hearing-detail-row">
            <strong>Last Updated At:</strong>
            <span>{formatISTDateTime(hearing.updatedAt)}</span>
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