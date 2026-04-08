import React from "react";
import "../styles/Topbar.css";

const Topbar = ({ setIsAuthenticated }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h2>Welcome, {user?.name || "User"}</h2>
        <p>
          Role: <span>{user?.role || "N/A"}</span>
        </p>
      </div>

      <div className="topbar-right">
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Topbar;
