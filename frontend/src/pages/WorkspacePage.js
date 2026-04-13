import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CaseManagement from "../components/CaseManagement";
import HearingManagement from "../components/HearingManagement";
import UserManagement from "../components/UserManagement";
import CauseList from "../components/CauseList";
import ClientAccounts from "../components/ClientAccounts";
import ClientDetails from "../components/ClientDetails";
import "../styles/DashboardPage.css";

const WorkspacePage = ({ setIsAuthenticated }) => {
  const [activeSection, setActiveSection] = useState("cases");

  const renderContent = () => {
    switch (activeSection) {
      case "cases":
        return <CaseManagement />;
      case "causeList":
        return <CauseList />;
      case "hearings":
        return <HearingManagement />;
      case "clientAccounts":
        return <ClientAccounts />;
      case "clientDetails":
        return <ClientDetails />;
      case "users":
        return <UserManagement />;
      default:
        return <CaseManagement />;
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

export default WorkspacePage;
