import React, { useState } from "react";
import api from "../services/api";
import "../styles/AuthPage.css";

const AuthPage = ({ setIsAuthenticated }) => {
  const [mode, setMode] = useState("login"); // login | forgot

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    newPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = res.data.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setMessage("Login successful.");
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post("/auth/forgot-password", {
        email: formData.email,
        newPassword: formData.newPassword,
      });

      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left">
          <h1 className="firm-title">Law Firm Manager</h1>
          <p className="firm-subtitle">
            A simple system to manage cases, hearings, and schedules efficiently.
          </p>
        </div>

        <div className="auth-right">
          <h2 className="auth-heading">
            {mode === "login" ? "Login" : "Reset Password"}
          </h2>

          <form
            className="auth-form"
            onSubmit={mode === "login" ? handleLogin : handleResetPassword}
          >
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {mode === "login" && (
              <>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="forgot-password">
                  <span onClick={() => setMode("forgot")}>
                    Forgot Password?
                  </span>
                </div>
              </>
            )}

            {mode === "forgot" && (
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            {message && <p className="success-text">{message}</p>}
            {error && <p className="error-text">{error}</p>}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : "Reset Password"}
            </button>

            {mode === "forgot" && (
              <p style={{ marginTop: "10px", fontSize: "0.85rem" }}>
                <span
                  style={{ color: "#9d5e3d", cursor: "pointer" }}
                  onClick={() => setMode("login")}
                >
                  Back to Login
                </span>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;