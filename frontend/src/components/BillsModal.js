import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import "../styles/BillsModal.css";

const STATUS_OPTIONS = ["Due", "Cleared", "Overdue"];

const fmtAmount = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) =>
  d ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(d)) : "—";

const toInputDate = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

const BillsModal = ({ client, authHeaders, onClose }) => {
  const isAdmin = JSON.parse(localStorage.getItem("user") || "{}").role === "admin";

  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [form, setForm] = useState({
    invoiceDate: "",
    amount: "",
    status: "Due",
    description: "",
  });
  const [file, setFile] = useState(null);
  const fileRef = useRef();

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/invoices?clientDetailId=${client._id}`, authHeaders);
      setInvoices(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [client._id, authHeaders]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleStatusChange = async (invoice, newStatus) => {
    try {
      setUpdatingId(invoice._id);
      await api.put(`/invoices/${invoice._id}`, { status: newStatus }, authHeaders);
      setInvoices((prev) =>
        prev.map((inv) => inv._id === invoice._id ? { ...inv, status: newStatus } : inv)
      );
    } catch (err) {
      alert("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleView = async (invoice) => {
    try {
      setViewingId(invoice._id);
      const res = await api.get(`/invoices/${invoice._id}/view`, authHeaders);
      window.open(res.data.url, "_blank");
    } catch (err) {
      alert("No file attached to this invoice.");
    } finally {
      setViewingId(null);
    }
  };

  const handleDelete = async (invoice) => {
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
    try {
      setDeletingId(invoice._id);
      await api.delete(`/invoices/${invoice._id}`, authHeaders);
      setInvoices((prev) => prev.filter((inv) => inv._id !== invoice._id));
    } catch (err) {
      alert("Failed to delete invoice.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.invoiceDate || !form.amount) {
      alert("Invoice date and amount are required.");
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("clientDetailId", client._id);
      fd.append("caseId", client.caseId?._id || client.caseId);
      fd.append("invoiceDate", form.invoiceDate);
      fd.append("amount", form.amount);
      fd.append("status", form.status);
      fd.append("description", form.description);
      if (file) fd.append("file", file);

      await api.post("/invoices", fd, {
        headers: {
          ...authHeaders.headers,
          "Content-Type": "multipart/form-data",
        },
      });

      setForm({ invoiceDate: "", amount: "", status: "Due", description: "" });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add invoice.");
    } finally {
      setSaving(false);
    }
  };

  const totalDue      = invoices.filter((i) => i.status === "Due" || i.status === "Overdue").reduce((s, i) => s + i.amount, 0);
  const totalCleared  = invoices.filter((i) => i.status === "Cleared").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card bm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            Bills — {client.name}
            <span className="bm-sub">
              {client.caseId?.registrationNumber ? ` · Reg #${client.caseId.registrationNumber}` : ""}
            </span>
          </h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="bm-body">
          {/* ── Summary stats ── */}
          {invoices.length > 0 && (
            <div className="bm-summary">
              <div className="bm-stat">
                <span className="bm-stat-val">{invoices.length}</span>
                <span className="bm-stat-lbl">Total Bills</span>
              </div>
              <div className="bm-stat bm-stat-due">
                <span className="bm-stat-val">{fmtAmount(totalDue)}</span>
                <span className="bm-stat-lbl">Pending</span>
              </div>
              <div className="bm-stat bm-stat-cleared">
                <span className="bm-stat-val">{fmtAmount(totalCleared)}</span>
                <span className="bm-stat-lbl">Cleared</span>
              </div>
            </div>
          )}

          {/* ── Invoice list ── */}
          <div className="bm-section-label">
            All Bills
            <span className="bm-count">{invoices.length}</span>
          </div>

          {loading ? (
            <p className="bm-empty">Loading…</p>
          ) : invoices.length === 0 ? (
            <p className="bm-empty">No bills added yet.</p>
          ) : (
            <table className="bm-table">
              <thead>
                <tr>
                  <th>Invoice Date</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Added By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id}>
                    <td>{fmtDate(inv.invoiceDate)}</td>
                    <td className="bm-amount">{fmtAmount(inv.amount)}</td>
                    <td>{inv.description || <em className="bm-muted">—</em>}</td>
                    <td>
                      <select
                        className={`bm-status-select bm-status-${inv.status.toLowerCase()}`}
                        value={inv.status}
                        disabled={updatingId === inv._id}
                        onChange={(e) => handleStatusChange(inv, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>{inv.createdBy?.name || "—"}</td>
                    <td>
                      <div className="bm-row-actions">
                        {inv.s3Key && (
                          <button
                            className="bm-view-btn"
                            onClick={() => handleView(inv)}
                            disabled={viewingId === inv._id}
                          >
                            {viewingId === inv._id ? "…" : "File"}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            className="bm-delete-btn"
                            onClick={() => handleDelete(inv)}
                            disabled={deletingId === inv._id}
                          >
                            {deletingId === inv._id ? "…" : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ── Add invoice form ── */}
          <div className="bm-section-label bm-add-label">Add New Bill</div>
          <form className="bm-add-form" onSubmit={handleAdd}>
            <div className="bm-form-row">
              <div className="form-group">
                <label>Invoice Date <span className="required-mark">*</span></label>
                <input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) => setForm((p) => ({ ...p, invoiceDate: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Amount (₹) <span className="required-mark">*</span></label>
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="e.g. 5000"
                  required
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="bm-form-row">
              <div className="form-group bm-desc-group">
                <label>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Hearing fees for 13 April"
                />
              </div>
              <div className="form-group">
                <label>Attach File (optional)</label>
                <input
                  type="file"
                  ref={fileRef}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  className="bm-file-input"
                />
              </div>
              <button type="submit" className="primary-btn bm-add-btn" disabled={saving}>
                {saving ? "Adding…" : "Add Bill"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BillsModal;
