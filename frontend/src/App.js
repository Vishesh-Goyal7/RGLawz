import React, { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  return isAuthenticated ? (
    <DashboardPage setIsAuthenticated={setIsAuthenticated} />
  ) : (
    <AuthPage setIsAuthenticated={setIsAuthenticated} />
  );
}

export default App;