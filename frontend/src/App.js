import React, { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import WorkspacePage from "./pages/WorkspacePage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  return isAuthenticated ? (
    <WorkspacePage setIsAuthenticated={setIsAuthenticated} />
  ) : (
    <AuthPage setIsAuthenticated={setIsAuthenticated} />
  );
}

export default App;