const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const caseRoutes = require("./routes/caseRoutes");
const hearingRoutes = require("./routes/hearingRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Law firm backend is running",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/hearings", hearingRoutes);

module.exports = app;