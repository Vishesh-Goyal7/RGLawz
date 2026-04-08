import React from "react";
import "../styles/Sidebar.css";

const Sidebar = ({ activeSection, setActiveSection }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const menuItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "cases", label: "Cases" },
    { key: "hearings", label: "Hearings" },
    { key: "calendar", label: "Calendar" },
    ...(user.role === "admin" ? [{ key: "users", label: "Users" }] : []),
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">Law Firm Manager</div>

      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <button
            key={item.key}
            className={`sidebar-item ${
              activeSection === item.key ? "active" : ""
            }`}
            onClick={() => setActiveSection(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;