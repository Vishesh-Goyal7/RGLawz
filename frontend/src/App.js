import React, { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import WorkspacePage from "./pages/WorkspacePage";
import SplashScreen from "./components/SplashScreen";
import Footer from "./components/Footer";
import "./styles/App.css";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <div className="app-root">
      <div className="office-banner">OFFICE OF RGLAWZ</div>
      {isAuthenticated ? (
        <WorkspacePage setIsAuthenticated={setIsAuthenticated} />
      ) : (
        <AuthPage setIsAuthenticated={setIsAuthenticated} />
      )}
      <Footer />
    </div>
  );
}

export default App;
