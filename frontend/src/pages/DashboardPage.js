import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CaseManagement from "../components/CaseManagement";
import UserManagement from "../components/UserManagement";
import HearingManagement from "../components/HearingManagement";
import HearingFormModal from "../components/HearingFormModal";
import "../styles/DashboardPage.css";
import "../styles/HearingManagement.css";

const DashboardPage = ({ setIsAuthenticated }) => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [cases, setCases] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState(null);

  const token = localStorage.getItem("token");

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [casesRes, hearingsRes] = await Promise.all([
        api.get("/cases", authHeaders),
        api.get("/hearings", authHeaders),
      ]);

      setCases(casesRes.data.data || []);
      setHearings(hearingsRes.data.data || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openHearingModal = (hearing) => {
    setEditingHearing(hearing);
    setIsHearingModalOpen(true);
  };

  const closeHearingModal = () => {
    setEditingHearing(null);
    setIsHearingModalOpen(false);
  };

  const isSameDay = (dateA, dateB) => {
    const a = new Date(dateA);
    const b = new Date(dateB);

    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const todaysHearings = useMemo(() => {
    return hearings
      .filter((hearing) => isSameDay(hearing.hearingDate, now))
      .sort((a, b) => new Date(a.hearingDate) - new Date(b.hearingDate));
  }, [hearings, now]);

  const totalCases = cases.length;
  const activeCases = cases.filter((c) => c.caseStatus === "active").length;
  const pendingCases = cases.filter((c) => c.caseStatus === "pending").length;
  const disposedCases = cases.filter((c) => c.caseStatus === "disposed").length;

  const renderDashboardHome = () => (
    <>
      <div className="summary-grid">
        <div className="summary-card">
          <h3>Total Cases</h3>
          <p>{totalCases}</p>
        </div>

        <div className="summary-card">
          <h3>Active Cases</h3>
          <p>{activeCases}</p>
        </div>

        <div className="summary-card">
          <h3>Pending Cases</h3>
          <p>{pendingCases}</p>
        </div>

        <div className="summary-card">
          <h3>Disposed Cases</h3>
          <p>{disposedCases}</p>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>Recent Cases</h3>
          </div>

          {cases.length === 0 ? (
            <p className="empty-text">No cases found.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Case Number</th>
                    <th>Case Name</th>
                    <th>Status</th>
                    <th>Next Hearing</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.slice(0, 5).map((item) => (
                    <tr key={item._id}>
                      <td>{item.caseNumber}</td>
                      <td>{item.caseName}</td>
                      <td>{item.caseStatus}</td>
                      <td>
                        {item.nextHearingDate
                          ? new Date(item.nextHearingDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>Today's Hearings</h3>
          </div>

          {todaysHearings.length === 0 ? (
            <p className="empty-text">No hearings scheduled for today.</p>
          ) : (
            <div>
              {todaysHearings.map((item) => (
                <div className="today-hearing-card" key={item._id}>
                  <div>
                    <h4>
                      {item.caseId?.caseNumber} — {item.caseId?.caseName}
                    </h4>
                    <p>
                      Time: {new Date(item.hearingDate).toLocaleTimeString()}
                    </p>
                    <p>Status: {item.hearingStatus}</p>
                  </div>

                  <button
                    className="primary-btn"
                    onClick={() => openHearingModal(item)}
                  >
                    Add Hearing Info
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderPlaceholder = (title, subtitle) => (
    <div className="placeholder-section">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return <div className="loading-text">Loading dashboard...</div>;
    }

    switch (activeSection) {
      case "dashboard":
        return renderDashboardHome();
      case "cases":
        return <CaseManagement />;
      case "hearings":
        return <HearingManagement />;
      case "calendar":
        return renderPlaceholder(
          "Calendar Module",
          "Auto calendar view will be added next."
        );
      case "users":
        return <UserManagement />;
      default:
        return renderDashboardHome();
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      <div className="dashboard-main">
        <Topbar setIsAuthenticated={setIsAuthenticated} />

        <div className="dashboard-content">{renderContent()}</div>
      </div>

      {isHearingModalOpen && (
        <HearingFormModal
          onClose={closeHearingModal}
          onSuccess={fetchDashboardData}
          editingHearing={editingHearing}
          authHeaders={authHeaders}
        />
      )}
    </div>
  );
};

export default DashboardPage;