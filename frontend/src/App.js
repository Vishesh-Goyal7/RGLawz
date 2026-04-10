import React, { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import WorkspacePage from "./pages/WorkspacePage";
import "./styles/App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div className="app-root">
      <div className="office-banner">OFFICE OF RGLAWZ</div>
      {isAuthenticated ? (
        <WorkspacePage setIsAuthenticated={setIsAuthenticated} />
      ) : (
        <AuthPage setIsAuthenticated={setIsAuthenticated} />
      )}
    </div>
  );
}

export default App;