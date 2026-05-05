import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CaseManagement from "../components/CaseManagement";
import HearingManagement from "../components/HearingManagement";
import UserManagement from "../components/UserManagement";
import CauseList from "../components/CauseList";
import ClientAccounts from "../components/ClientAccounts";
import ClientDetails from "../components/ClientDetails";
import HearingBills from "../components/HearingBills";
import "../styles/DashboardPage.css";

const WorkspacePage = ({ setIsAuthenticated }) => {
  const [activeSection, setActiveSection] = useState("cases");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const activeSectionRef = useRef("cases");
  const sentinelCount = useRef(0);

  // Keep ref in sync with state so event handlers always see current section
  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    // Push one sentinel so popstate fires when the user presses back
    window.history.pushState(null, "");
    sentinelCount.current = 1;

    const handlePopState = () => {
      if (activeSectionRef.current !== "cases") {
        // Any non-home section → bring user back to cases
        setActiveSection("cases");
      } else {
        // Already on cases → show exit dialog
        setShowExitDialog(true);
      }
      // Re-push sentinel to keep intercepting future back presses
      window.history.pushState(null, "");
      sentinelCount.current += 1;
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleJustExit = () => {
    setShowExitDialog(false);
    // Go back past all sentinels + the app page itself
    window.history.go(-(sentinelCount.current + 1));
  };

  const handleLogoutAndExit = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setShowExitDialog(false);
  };

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
      case "hearingBills":
        return <HearingBills />;
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
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />

      <div className="dashboard-main">
        <Topbar setIsAuthenticated={setIsAuthenticated} setIsMenuOpen={setIsMenuOpen} />
        <div className="dashboard-content">{renderContent()}</div>
      </div>

      {showExitDialog && (
        <div className="exit-dialog-overlay" onClick={() => setShowExitDialog(false)}>
          <div className="exit-dialog-card" onClick={(e) => e.stopPropagation()}>
            <button className="exit-dialog-close" onClick={() => setShowExitDialog(false)}>×</button>
            <div className="exit-dialog-icon">👋</div>
            <h3 className="exit-dialog-title">Leaving RGLawz?</h3>
            <p className="exit-dialog-msg">Your session will remain active unless you log out.</p>
            <div className="exit-dialog-actions">
              <button className="exit-btn-secondary" onClick={handleJustExit}>
                Just Exit
              </button>
              <button className="exit-btn-primary" onClick={handleLogoutAndExit}>
                Logout &amp; Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspacePage;
