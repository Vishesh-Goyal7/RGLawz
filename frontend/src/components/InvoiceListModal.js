import React, { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import PaymentFormModal from "./PaymentFormModal";
import "../styles/CaseManagement.css";
import "../styles/InvoiceModal.css";

const fmtDate = (d) =>
  d
    ? new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(new Date(d))
    : "—";

const fmtAmount = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const STATUS_COLORS = {
  Due: { bg: "#fff7e6", color: "#b45309", border: "#fcd34d" },
  Overdue: { bg: "#fff1f0", color: "#b91c1c", border: "#fca5a5" },
  Cleared: { bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
};

const InvoiceListModal = ({ caseId, caseName, clientCases, authHeaders, onClose, onPaymentAdded }) => {
  const isAdmin = JSON.parse(localStorage.getItem("user") || "{}").role === "admin";

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewInvoice, setPreviewInvoice] = useState(null); // { invoice, url }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [paymentData, setPaymentData] = useState(null); // for PaymentFormModal

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/invoices?caseId=${caseId}`, authHeaders);
      // Sort newest first by invoiceDate then createdAt
      const sorted = (res.data.data || []).sort((a, b) => {
        const da = new Date(a.invoiceDate);
        const db = new Date(b.invoiceDate);
        if (db - da !== 0) return db - da;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setInvoices(sorted);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [caseId]); // eslint-disable-line

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handlePreview = async (invoice) => {
    if (!invoice.s3Key) {
      alert("No PDF attached to this invoice.");
      return;
    }
    try {
      setPreviewLoading(true);
      setPreviewInvoice({ invoice, url: null });
      const res = await api.get(`/invoices/${invoice._id}/view`, authHeaders);
      setPreviewInvoice({ invoice, url: res.data.url });
    } catch (err) {
      console.error("Failed to load preview:", err);
      alert("Failed to load invoice PDF.");
      setPreviewInvoice(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleStatusChange = async (invoice, newStatus) => {
    if (invoice.status === newStatus) return;

    if (newStatus === "Cleared") {
      // Open payment form pre-filled with invoice amount
      setPaymentData({
        caseId: caseId,
        amount: invoice.amount,
        notes: `Invoice ${invoice.invoiceNumber || invoice._id.slice(-6)}`,
        invoiceId: invoice._id,
        newStatus,
      });
      return;
    }

    // For Due / Overdue — just update status directly
    await applyStatusUpdate(invoice._id, newStatus);
  };

  const applyStatusUpdate = async (invoiceId, newStatus) => {
    try {
      setStatusUpdating(invoiceId);
      await api.put(`/invoices/${invoiceId}`, { status: newStatus }, authHeaders);
      await fetchInvoices();
      // Refresh preview if it's the same invoice
      if (previewInvoice?.invoice?._id === invoiceId) {
        setPreviewInvoice((prev) => prev ? { ...prev, invoice: { ...prev.invoice, status: newStatus } } : prev);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update invoice status.");
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoiceNumber || inv._id.slice(-6)}? This cannot be undone.`)) return;
    try {
      await api.delete(`/invoices/${inv._id}`, authHeaders);
      if (previewInvoice?.invoice?._id === inv._id) setPreviewInvoice(null);
      await fetchInvoices();
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      alert(err.response?.data?.message || "Failed to delete invoice.");
    }
  };

  const handlePaymentSuccess = async () => {
    if (paymentData?.invoiceId) {
      await applyStatusUpdate(paymentData.invoiceId, paymentData.newStatus);
    }
    onPaymentAdded && onPaymentAdded();
    setPaymentData(null);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card inv-list-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Invoices — {caseName}</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="inv-list-body">
            {loading ? (
              <p className="inv-empty">Loading invoices…</p>
            ) : invoices.length === 0 ? (
              <p className="inv-empty">No invoices found for this case.</p>
            ) : (
              <div className="inv-list">
                {invoices.map((inv) => {
                  const sc = STATUS_COLORS[inv.status] || STATUS_COLORS.Due;
                  const isUpdating = statusUpdating === inv._id;
                  return (
                    <div
                      key={inv._id}
                      className={`inv-list-item${previewInvoice?.invoice?._id === inv._id ? " inv-list-item-active" : ""}`}
                      onClick={() => handlePreview(inv)}
                    >
                      <div className="inv-list-left">
                        <span className="inv-number">{inv.invoiceNumber || `#${inv._id.slice(-6)}`}</span>
                        <span className="inv-date">{fmtDate(inv.invoiceDate)}</span>
                      </div>
                      <div className="inv-list-right">
                        <span className="inv-amount">{fmtAmount(inv.amount)}</span>
                        <span
                          className="inv-status-badge"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                        >
                          {inv.status}
                        </span>
                      </div>
                      {/* Status buttons + delete */}
                      <div
                        className="inv-status-btns"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {["Due", "Overdue", "Cleared"].map((s) => (
                          <button
                            key={s}
                            className={`inv-status-btn${inv.status === s ? " inv-status-btn-active" : ""}`}
                            disabled={isUpdating || inv.status === s}
                            onClick={() => handleStatusChange(inv, s)}
                            style={inv.status === s ? { background: sc.bg, color: sc.color, borderColor: sc.border } : {}}
                          >
                            {s === "Cleared" ? "Paid" : s}
                          </button>
                        ))}
                        {isAdmin && (
                          <button
                            className="inv-delete-btn"
                            title="Delete invoice"
                            onClick={() => handleDelete(inv)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PDF preview area */}
            {previewInvoice && (
              <div className="inv-preview-section">
                <div className="inv-preview-header">
                  <span>
                    {previewInvoice.invoice.invoiceNumber || "Invoice"}
                  </span>
                  <div className="inv-preview-actions">
                    {previewInvoice.url && (
                      <a
                        href={previewInvoice.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inv-preview-open"
                      >
                        Open / Print ↗
                      </a>
                    )}
                    <button className="inv-preview-close" onClick={() => setPreviewInvoice(null)}>×</button>
                  </div>
                </div>
                {previewLoading ? (
                  <div className="inv-preview-loading">Loading PDF…</div>
                ) : previewInvoice.url ? (
                  <iframe
                    src={previewInvoice.url}
                    className="inv-preview-frame"
                    title="Invoice Preview"
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment modal — rendered outside the list modal overlay */}
      {paymentData && (
        <PaymentFormModal
          clientCases={clientCases}
          editingPayment={null}
          prefillData={{
            caseId: paymentData.caseId,
            amount: paymentData.amount,
            notes: paymentData.notes,
          }}
          authHeaders={authHeaders}
          onClose={() => setPaymentData(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
};

export default InvoiceListModal;
