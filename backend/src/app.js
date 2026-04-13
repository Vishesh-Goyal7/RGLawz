const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const caseRoutes = require("./routes/caseRoutes");
const hearingRoutes = require("./routes/hearingRoutes");
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const clientDetailRoutes = require("./routes/clientDetailRoutes");
const caseDocumentRoutes = require("./routes/caseDocumentRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");

const app = express();

// Middleware
app.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true,
}));
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
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/client-details", clientDetailRoutes);
app.use("/api/case-documents", caseDocumentRoutes);
app.use("/api/invoices", invoiceRoutes);

module.exports = app;