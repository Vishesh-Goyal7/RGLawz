import React from "react";
import "../styles/Footer.css";

const Footer = () => (
  <footer className="app-footer">
    <div className="footer-credit">
      Developed and Maintained by <a href="https://visheshverse.com" target="_blank" rel="noreferrer">VisheshVerse</a>
    </div>
    <div className="footer-contact">
      <a href="mailto:visheshvishu1@outlook.com">visheshvishu1@outlook.com</a>
      <span className="footer-sep">|</span>
      <span>+91 7827253699</span>
    </div>
  </footer>
);

export default Footer;
