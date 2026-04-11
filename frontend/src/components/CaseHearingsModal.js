import React, { useEffect, useState } from "react";
import api from "../services/api";
import HearingDetailModal from "./HearingDetailModal";
import HearingFormModal from "./HearingFormModal";
import "../styles/CaseManagement.css";

const formatISTDate = (dateValue) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateValue));

const CaseHearingsModal = ({ caseData, authHeaders, onClose }) => {
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHearing, setSelectedHearing] = useState(null);
  const [editingHearing, setEditingHearing] = useState(null);
  const [isFirstHearingModalOpen, setIsFirstHearingModalOpen] = useState(false);

  useEffect(() => {
    fetchHearings();
    // eslint-disable-next-line
  }, [caseData]);

  const fetchHearings = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/hearings?caseId=${caseData._id}`, authHeaders);
      setHearings(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch case hearings:", error);
    } finally {
      setLoading(false);
    }
  };

  const closeEditModal = () => {
    setEditingHearing(null);
    setIsFirstHearingModalOpen(false);
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-card history-modal">
          <div className="modal-header">
            <div>
              <h3>Hearings</h3>
              <p className="history-subtitle">
                {caseData.caseNumber} — {caseData.caseName}
              </p>
            </div>

            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="case-hearings-body">
            {loading ? (
              <p className="empty-text">Loading hearings...</p>
            ) : hearings.length === 0 ? (
              <div className="empty-hearing-state">
                <p className="empty-text">No hearings found for this case.</p>
                <button
                  className="primary-btn"
                  onClick={() => setIsFirstHearingModalOpen(true)}
                >
                  Add First Hearing
                </button>
              </div>
            ) : (
              <div className="case-hearing-list">
                {hearings.map((hearing) => (
                  <div className="case-hearing-item" key={hearing._id}>
                    <div
                      className="case-hearing-main"
                      onClick={() => setSelectedHearing(hearing)}
                    >
                      <div>
                        <h4>{formatISTDate(hearing.hearingDate)}</h4>
                        <p>Lawyer on Date: {hearing.appearedBy || "N/A"}</p>
                      </div>
                    </div>
                    <button
                      className="secondary-btn"
                      onClick={() => setEditingHearing(hearing)}
                    >
                      Update
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedHearing && (
        <HearingDetailModal
          hearing={selectedHearing}
          onClose={() => setSelectedHearing(null)}
        />
      )}

      {editingHearing && (
        <HearingFormModal
          editingHearing={editingHearing}
          authHeaders={authHeaders}
          onClose={closeEditModal}
          onSuccess={fetchHearings}
        />
      )}

      {isFirstHearingModalOpen && (
        <HearingFormModal
          editingHearing={null}
          authHeaders={authHeaders}
          onClose={closeEditModal}
          onSuccess={fetchHearings}
        />
      )}
    </>
  );
};

export default CaseHearingsModal;