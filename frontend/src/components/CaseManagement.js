import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import CaseFormModal from "./CaseFormModal";
import CaseHearingsModal from "./CaseHearingsModal";
import "../styles/CaseManagement.css";

const CaseManagement = () => {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  const [cases, setCases] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [hearingsCase, setHearingsCase] = useState(null);
  const [isHearingsOpen, setIsHearingsOpen] = useState(false);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await api.get("/cases", authHeaders);
      setCases(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users", authHeaders);
      setUsers(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const openCreateModal = () => {
    setIsFormOpen(true);
  };

  const openHearingsModal = (caseItem) => {
    setHearingsCase(caseItem);
    setIsHearingsOpen(true);
  };

  const closeModals = () => {
    setIsFormOpen(false);
    setIsHearingsOpen(false);
    setHearingsCase(null);
  };

  const handleDeleteCase = async (caseId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this case?"
    );
    if (!confirmed) return;

    try {
      await api.delete(`/cases/${caseId}`, authHeaders);
      await fetchCases();
    } catch (error) {
      console.error("Failed to delete case:", error);
      alert(error.response?.data?.message || "Failed to delete case.");
    }
  };

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const text = searchText.toLowerCase();

      const matchesSearch =
        item.caseNumber?.toLowerCase().includes(text) ||
        item.caseName?.toLowerCase().includes(text) ||
        item.petitioner?.toLowerCase().includes(text) ||
        item.defendant?.toLowerCase().includes(text);

      const matchesStatus = statusFilter
        ? item.caseStatus === statusFilter
        : true;

      const matchesCourt = courtFilter
        ? item.courtName?.toLowerCase().includes(courtFilter.toLowerCase())
        : true;

      return matchesSearch && matchesStatus && matchesCourt;
    });
  }, [cases, searchText, statusFilter, courtFilter]);

  return (
    <div className="case-management">
      <div className="case-toolbar">
        <div className="case-toolbar-left">
          <h2>Cases</h2>
          <p>Manage registered cases and track their hearings.</p>
        </div>

        <div className="case-toolbar-right">
          <button className="primary-btn" onClick={openCreateModal}>
            + Add Case
          </button>
        </div>
      </div>

      <div className="case-filters">
        <input
          type="text"
          placeholder="Search by case number, case name, petitioner, defendant"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="disposed">Disposed</option>
          <option value="on_hold">On Hold</option>
        </select>

        <input
          type="text"
          placeholder="Filter by court name"
          value={courtFilter}
          onChange={(e) => setCourtFilter(e.target.value)}
        />
      </div>

      <div className="cases-table-card">
        {loading ? (
          <p className="empty-text">Loading cases...</p>
        ) : filteredCases.length === 0 ? (
          <p className="empty-text">No cases found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Case Number</th>
                  <th>Petitioner</th>
                  <th>Defendant</th>
                  <th>Court</th>
                  <th>Judge Name</th>
                  <th>Last Hearing</th>
                  <th>Next Hearing</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((item) => (
                  <tr key={item._id}>
                    <td>{item.caseNumber}</td>
                    <td>{item.petitioner}</td>
                    <td>{item.defendant}</td>
                    <td>{item.courtName || "N/A"}</td>
                    <td>{item.judgeName || "N/A"}</td>
                    <td>
                      {item.latestHearingId?.hearingDate
                        ? new Intl.DateTimeFormat("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }).format(new Date(item.latestHearingId.hearingDate))
                        : "N/A"}
                    </td>
                    <td>
                      {item.nextHearingDate
                        ? new Intl.DateTimeFormat("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }).format(new Date(item.nextHearingDate))
                        : "N/A"}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="hearing-link-btn"
                          onClick={() => openHearingsModal(item)}
                        >
                          Hearings
                        </button>

                        {storedUser.role === "admin" && (
                          <button
                            className="danger-btn"
                            onClick={() => handleDeleteCase(item._id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <CaseFormModal
          onClose={closeModals}
          onSuccess={fetchCases}
          editingCase={null}
          authHeaders={authHeaders}
        />
      )}

      {isHearingsOpen && hearingsCase && (
        <CaseHearingsModal
          caseData={hearingsCase}
          authHeaders={authHeaders}
          onClose={closeModals}
        />
      )}
    </div>
  );
};

export default CaseManagement;