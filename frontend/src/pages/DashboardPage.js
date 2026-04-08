import React, { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CaseManagement from "../components/CaseManagement";
import UserManagement from "../components/UserManagement";
import "../styles/DashboardPage.css";

const DashboardPage = ({ setIsAuthenticated }) => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [cases, setCases] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const today = new Date();

  const upcomingHearings = hearings
    .filter((hearing) => hearing.nextHearingDate || hearing.hearingDate)
    .sort(
      (a, b) =>
        new Date(a.nextHearingDate || a.hearingDate) -
        new Date(b.nextHearingDate || b.hearingDate)
    )
    .slice(0, 5);

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
            <h3>Upcoming Hearings</h3>
          </div>

          {upcomingHearings.length === 0 ? (
            <p className="empty-text">No upcoming hearings found.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Hearing Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingHearings.map((item) => (
                    <tr key={item._id}>
                      <td>{item.caseId?.caseName || "Unnamed Case"}</td>
                      <td>
                        {new Date(
                          item.nextHearingDate || item.hearingDate
                        ).toLocaleDateString()}
                      </td>
                      <td>{item.hearingStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        return renderPlaceholder(
          "Hearings Module",
          "Hearing management UI will be added next."
        );
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
    </div>
  );
};

export default DashboardPage;
