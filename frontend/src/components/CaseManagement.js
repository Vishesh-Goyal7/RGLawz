import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import CaseFormModal from "./CaseFormModal";
import CaseHistoryModal from "./CaseHistoryModal";
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
  const [editingCase, setEditingCase] = useState(null);

  const [historyCase, setHistoryCase] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    fetchCases();
    if (storedUser.role === "admin") {
      fetchUsers();
    }
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
    setEditingCase(null);
    setIsFormOpen(true);
  };

  const openEditModal = (caseItem) => {
    setEditingCase(caseItem);
    setIsFormOpen(true);
  };

  const openHistoryModal = async (caseItem) => {
    try {
      const res = await api.get(`/cases/${caseItem._id}`, authHeaders);
      setHistoryCase(res.data.data);
      setIsHistoryOpen(true);
    } catch (error) {
      console.error("Failed to fetch case history:", error);
      alert("Failed to load case history.");
    }
  };

  const closeModals = () => {
    setIsFormOpen(false);
    setEditingCase(null);
    setIsHistoryOpen(false);
    setHistoryCase(null);
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
          <p>Manage all case records and track their history.</p>
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
                  <th>Case Name</th>
                  <th>Petitioner</th>
                  <th>Defendant</th>
                  <th>Status</th>
                  <th>Court</th>
                  <th>Assigned Lawyers</th>
                  <th>Primary Lawyer</th>
                  <th>Next Hearing</th>
                  <th>Updated By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((item) => (
                  <tr key={item._id}>
                    <td>{item.caseNumber}</td>
                    <td>{item.caseName}</td>
                    <td>{item.petitioner}</td>
                    <td>{item.defendant}</td>
                    <td>
                      <span className={`status-badge ${item.caseStatus}`}>
                        {item.caseStatus}
                      </span>
                    </td>
                    <td>{item.courtName || "N/A"}</td>
                    <td>
                      {(item.lawyerIds || []).length > 0
                        ? item.lawyerIds.map((l) => l.name).join(", ")
                        : "Unassigned"}
                    </td>
                    <td>{item.primaryLawyerId?.name || "N/A"}</td>
                    <td>
                      {item.nextHearingDate
                        ? new Date(item.nextHearingDate).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td>{item.updatedBy?.name || "N/A"}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="secondary-btn"
                          onClick={() => openEditModal(item)}
                        >
                          Edit
                        </button>

                        <button
                          className="history-btn"
                          onClick={() => openHistoryModal(item)}
                        >
                          History
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
          editingCase={editingCase}
          authHeaders={authHeaders}
          users={users}
          currentUser={storedUser}
        />
      )}

      {isHistoryOpen && historyCase && (
        <CaseHistoryModal caseData={historyCase} onClose={closeModals} />
      )}
    </div>
  );
};

export default CaseManagement;