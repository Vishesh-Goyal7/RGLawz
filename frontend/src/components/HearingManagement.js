import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import HearingFormModal from "./HearingFormModal";
import HearingDetailModal from "./HearingDetailModal";
import "../styles/HearingManagement.css";

const HearingManagement = () => {
  const token = localStorage.getItem("token");

  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState(null);
  const [selectedHearing, setSelectedHearing] = useState(null);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    fetchHearings();
    // eslint-disable-next-line
  }, []);

  const fetchHearings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/hearings", authHeaders);
      setHearings(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch hearings:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingHearing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (hearing) => {
    setEditingHearing(hearing);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingHearing(null);
    setIsModalOpen(false);
  };

  const filteredHearings = useMemo(() => {
    return hearings.filter((item) => {
      const text = searchText.toLowerCase();

      const matchesSearch =
        item.caseId?.caseNumber?.toLowerCase().includes(text) ||
        item.caseId?.caseName?.toLowerCase().includes(text) ||
        item.hearingVerdict?.toLowerCase().includes(text) ||
        item.hearingNotes?.toLowerCase().includes(text);

      const matchesStatus = statusFilter
        ? item.hearingStatus === statusFilter
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [hearings, searchText, statusFilter]);

  const groupedHearings = useMemo(() => {
    const grouped = {};

    filteredHearings.forEach((hearing) => {
      const caseId = hearing.caseId?._id || "unknown";
      const caseLabel = hearing.caseId
        ? `${hearing.caseId.caseNumber} — ${hearing.caseId.caseName}`
        : "Unknown Case";

      if (!grouped[caseId]) {
        grouped[caseId] = {
          caseId,
          caseLabel,
          hearings: [],
        };
      }

      grouped[caseId].hearings.push(hearing);
    });

    Object.values(grouped).forEach((group) => {
      group.hearings.sort(
        (a, b) => new Date(b.hearingDate) - new Date(a.hearingDate)
      );
    });

    return Object.values(grouped).sort((a, b) => {
      const aLatest = a.hearings[0]?.hearingDate || 0;
      const bLatest = b.hearings[0]?.hearingDate || 0;
      return new Date(bLatest) - new Date(aLatest);
    });
  }, [filteredHearings]);

  const renderHearingRow = (item) => (
    <div className="grouped-hearing-row" key={item._id}>
      <div
        className="grouped-hearing-main"
        onClick={() => setSelectedHearing(item)}
      >
        <div>
          <h4>{new Date(item.hearingDate).toLocaleString()}</h4>
          <p>
            Status: <span>{item.hearingStatus}</span>
          </p>
          <p>
            Next Date:{" "}
            {item.nextHearingDate
              ? new Date(item.nextHearingDate).toLocaleString()
              : "N/A"}
          </p>
        </div>

        <span className={`status-badge ${item.hearingStatus}`}>
          {item.hearingStatus}
        </span>
      </div>

      <div className="grouped-hearing-actions">
        <button className="secondary-btn" onClick={() => openEditModal(item)}>
          Update
        </button>
      </div>
    </div>
  );

  return (
    <div className="hearing-management">
      <div className="hearing-toolbar">
        <div>
          <h2>Hearings</h2>
          <p>Track all accessible hearings grouped case-wise.</p>
        </div>

        <button className="primary-btn" onClick={openCreateModal}>
          + Add Hearing
        </button>
      </div>

      <div className="hearing-filters">
        <input
          type="text"
          placeholder="Search by case number, case name, verdict, notes"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="done">Done</option>
          <option value="adjourned">Adjourned</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="hearing-group-list">
        {loading ? (
          <div className="hearing-table-card">
            <p className="empty-text">Loading hearings...</p>
          </div>
        ) : groupedHearings.length === 0 ? (
          <div className="hearing-table-card">
            <p className="empty-text">No hearings found.</p>
          </div>
        ) : (
          groupedHearings.map((group) => {
            const latestFour = group.hearings.slice(0, 4);
            const olderHearings = group.hearings.slice(4);

            return (
              <div className="hearing-group-card" key={group.caseId}>
                <div className="hearing-group-header">
                  <h3>{group.caseLabel}</h3>
                  <span>{group.hearings.length} hearing(s)</span>
                </div>

                <div className="hearing-group-latest">
                  {latestFour.map(renderHearingRow)}
                </div>

                {olderHearings.length > 0 && (
                  <div className="hearing-group-older-wrapper">
                    <h4>Older Hearings</h4>
                    <div className="hearing-group-older-scroll">
                      {olderHearings.map(renderHearingRow)}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <HearingFormModal
          onClose={closeModal}
          onSuccess={fetchHearings}
          editingHearing={editingHearing}
          authHeaders={authHeaders}
        />
      )}

      {selectedHearing && (
        <HearingDetailModal
          hearing={selectedHearing}
          onClose={() => setSelectedHearing(null)}
        />
      )}
    </div>
  );
};

export default HearingManagement;