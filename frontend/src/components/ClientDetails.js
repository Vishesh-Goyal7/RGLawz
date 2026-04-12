import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../styles/ClientDetails.css";

const fmt = (dateVal) =>
  dateVal
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(dateVal))
    : "—";

const fmtAmount = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

/* ── Edit Client Detail Modal ─────────────────────────── */
const EditClientModal = ({ client, authHeaders, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    email: client.email || "",
    phone: client.phone || "",
    address: client.address || "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put(`/client-details/${client._id}`, form, authHeaders);
      await onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update client details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card cd-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Client — {client.name}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="cd-edit-form">
          <div className="form-group">
            <label>Client Name</label>
            <input type="text" value={client.name} readOnly className="readonly-input" />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="e.g. 9810000000"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. client@email.com"
            />
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows="3"
              placeholder="Client's full address"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Case & Account Detail Modal ──────────────────────── */
const CaseDetailModal = ({ client, payments, onClose, onEdit }) => {
  const c = client.caseId;
  if (!c) return null;

  const casePayments = payments.filter(
    (p) => (p.caseId?._id || p.caseId)?.toString() === c._id?.toString()
  );
  const totalPaid = casePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card cd-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Client — {client.name}</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="cl-print-btn" onClick={onEdit}>Edit Details</button>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="cd-detail-body">
          {/* ── Contact info ── */}
          <div className="cd-info-grid">
            {client.phone && (
              <div className="cd-info-item">
                <span className="cd-info-label">Phone</span>
                <span>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="cd-info-item">
                <span className="cd-info-label">Email</span>
                <span>{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="cd-info-item cd-info-full">
                <span className="cd-info-label">Address</span>
                <span>{client.address}</span>
              </div>
            )}
          </div>

          {/* ── Case details ── */}
          <div className="cd-section-label">Case Details</div>
          <div className="cd-info-grid">
            <div className="cd-info-item">
              <span className="cd-info-label">Reg. No.</span>
              <span>{c.registrationNumber || "—"}</span>
            </div>
            <div className="cd-info-item">
              <span className="cd-info-label">Court Case No.</span>
              <span>{c.caseNumber || "—"}</span>
            </div>
            <div className="cd-info-item">
              <span className="cd-info-label">Petitioner</span>
              <span>
                {c.petitioner || "—"}
                {c.ourClient === "petitioner" && (
                  <span className="our-client-mark" title="Our Client"> *</span>
                )}
              </span>
            </div>
            <div className="cd-info-item">
              <span className="cd-info-label">Defendant</span>
              <span>
                {c.defendant || "—"}
                {c.ourClient === "defendant" && (
                  <span className="our-client-mark" title="Our Client"> *</span>
                )}
              </span>
            </div>
            <div className="cd-info-item">
              <span className="cd-info-label">Court</span>
              <span>{c.courtName || "—"}</span>
            </div>
            <div className="cd-info-item">
              <span className="cd-info-label">Judge</span>
              <span>{c.judgeName || "—"}</span>
            </div>
            <div className="cd-info-item">
              <span className="cd-info-label">Status</span>
              <span className={`cd-status cd-status-${c.caseStatus}`}>
                {c.caseStatus || "—"}
              </span>
            </div>
            <div className="cd-info-item">
              <span className="cd-info-label">Next Hearing</span>
              <span>{fmt(c.nextHearingDate)}</span>
            </div>
          </div>

          {/* ── Account summary ── */}
          <div className="cd-section-label">Account Summary</div>
          <div className="cd-account-summary">
            <div className="cd-account-stat">
              <span className="cd-account-val">{fmtAmount(totalPaid)}</span>
              <span className="cd-account-lbl">Total Received</span>
            </div>
            <div className="cd-account-stat">
              <span className="cd-account-val">{casePayments.length}</span>
              <span className="cd-account-lbl">Payments</span>
            </div>
            <div className="cd-account-stat">
              <span className="cd-account-val">
                {casePayments.length > 0 ? fmt(casePayments[0].date) : "—"}
              </span>
              <span className="cd-account-lbl">Last Payment</span>
            </div>
          </div>

          {casePayments.length > 0 && (
            <table className="cd-payment-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {casePayments.map((p) => (
                  <tr key={p._id}>
                    <td>{fmt(p.date)}</td>
                    <td>{fmtAmount(p.amount)}</td>
                    <td>{p.paymentMethod || "—"}</td>
                    <td>{p.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ───────────────────────────────────── */
const ClientDetails = () => {
  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [clients, setClients]   = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  const [detailClient, setDetailClient] = useState(null);
  const [editClient, setEditClient]     = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsRes, paymentsRes] = await Promise.all([
        api.get("/client-details", authHeaders),
        api.get("/payments", authHeaders),
      ]);
      setClients(clientsRes.data.data || []);
      setPayments(paymentsRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch client details:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.caseId?.caseNumber?.toLowerCase().includes(q) ||
        c.caseId?.petitioner?.toLowerCase().includes(q) ||
        c.caseId?.defendant?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <div className="client-details-page">
      <div className="cd-toolbar">
        <div>
          <h2>Client Details</h2>
          <p>Contact information for all registered clients.</p>
        </div>
        <input
          className="cd-search"
          type="text"
          placeholder="Search by name, phone, email, case…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="cd-empty">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="cd-empty">
          {search ? "No clients match your search." : "No client details added yet."}
        </p>
      ) : (
        <div className="cd-table-card">
          <table className="cd-table">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Reg. No.</th>
                <th>Case Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client._id}>
                  <td className="cd-name-cell">{client.name}</td>
                  <td>{client.phone || <em className="cd-empty-cell">—</em>}</td>
                  <td>{client.email || <em className="cd-empty-cell">—</em>}</td>
                  <td className="cd-address-cell">
                    {client.address || <em className="cd-empty-cell">—</em>}
                  </td>
                  <td>{client.caseId?.registrationNumber || "—"}</td>
                  <td>
                    {client.caseId?.caseStatus ? (
                      <span className={`cd-status cd-status-${client.caseId.caseStatus}`}>
                        {client.caseId.caseStatus}
                      </span>
                    ) : "—"}
                  </td>
                  <td>
                    <button
                      className="cd-view-btn"
                      onClick={() => setDetailClient(client)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailClient && (
        <CaseDetailModal
          client={detailClient}
          payments={payments}
          onClose={() => setDetailClient(null)}
          onEdit={() => {
            setEditClient(detailClient);
            setDetailClient(null);
          }}
        />
      )}

      {editClient && (
        <EditClientModal
          client={editClient}
          authHeaders={authHeaders}
          onClose={() => setEditClient(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default ClientDetails;
