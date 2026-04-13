import React, { useEffect, useState } from "react";
import "../styles/SplashScreen.css";

const SplashScreen = ({ onDone }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const shrinkTimer = setTimeout(() => setExiting(true), 2200);
    const doneTimer = setTimeout(() => onDone(), 2800);
    return () => {
      clearTimeout(shrinkTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className={`splash-root${exiting ? " splash-exit" : ""}`}>
      <div className="splash-content">
        <img src={`${process.env.PUBLIC_URL}/me.png`} alt="Developer" className="splash-avatar" />
        <p className="splash-developed">Developed and Maintained by VisheshVerse</p>
        <p className="splash-commissioned">Commissioned by RGLawz</p>
      </div>
    </div>
  );
};

export default SplashScreen;
