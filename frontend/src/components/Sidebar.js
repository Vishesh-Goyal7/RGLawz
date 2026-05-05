import React from "react";
import "../styles/Sidebar.css";

const Sidebar = ({ activeSection, setActiveSection, isMenuOpen, setIsMenuOpen }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const menuItems = [
    { key: "cases", label: "Cases" },
    { key: "causeList", label: "Cause List" },
    { key: "hearings", label: "Hearings" },
    { key: "clientAccounts", label: "Client Accounts" },
    { key: "clientDetails", label: "Client Details" },
    { key: "hearingBills", label: "Bills" },
    ...(user.role === "admin" ? [{ key: "users", label: "Users" }] : []),
  ];

  const handleSelect = (key) => {
    setActiveSection(key);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">RG Lawz Manager</div>
        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.key}
              className={`sidebar-item ${activeSection === item.key ? "active" : ""}`}
              onClick={() => setActiveSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile drawer */}
      {isMenuOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setIsMenuOpen(false)} />
          <div className="drawer-panel">
            <div className="drawer-header">
              <div className="drawer-logo">RG Lawz Manager</div>
              <button className="drawer-close" onClick={() => setIsMenuOpen(false)}>✕</button>
            </div>
            <div className="drawer-menu">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  className={`sidebar-item ${activeSection === item.key ? "active" : ""}`}
                  onClick={() => handleSelect(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Sidebar;
