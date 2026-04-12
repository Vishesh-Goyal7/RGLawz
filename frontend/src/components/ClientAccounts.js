import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import PaymentFormModal from "./PaymentFormModal";
import "../styles/ClientAccounts.css";

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
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const ClientAccounts = () => {
  const token = localStorage.getItem("token");
  const isAdmin = JSON.parse(localStorage.getItem("user") || "{}").role === "admin";
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [cases, setCases]       = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchText, setSearchText] = useState("");

  const [paymentModal, setPaymentModal] = useState(null); // { clientCases, editingPayment? }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [casesRes, paymentsRes] = await Promise.all([
        api.get("/cases", authHeaders),
        api.get("/payments", authHeaders),
      ]);
      setCases(casesRes.data.data || []);
      setPayments(paymentsRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch client accounts data:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── group cases by client name ─────────────────────── */
  const clientGroups = useMemo(() => {
    const map = {};
    cases.forEach((c) => {
      const clientName = c.ourClient === "petitioner" ? c.petitioner : c.defendant;
      if (!clientName) return;
      if (!map[clientName]) map[clientName] = { clientName, cases: [] };
      map[clientName].cases.push(c);
    });
    return Object.values(map).sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [cases]);

  /* ── payment lookup by caseId ───────────────────────── */
  const paymentsByCaseId = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      const cid = p.caseId?._id || p.caseId;
      if (!map[cid]) map[cid] = [];
      map[cid].push(p);
    });
    // Sort each case's payments by date descending
    Object.values(map).forEach((list) =>
      list.sort((a, b) => new Date(b.date) - new Date(a.date))
    );
    return map;
  }, [payments]);

  const totalForClient = (group) =>
    group.cases.reduce((sum, c) => {
      const cid = c._id;
      return sum + (paymentsByCaseId[cid] || []).reduce((s, p) => s + p.amount, 0);
    }, 0);

  /* ── filter ─────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase();
    if (!q) return clientGroups;
    return clientGroups.filter((g) => g.clientName.toLowerCase().includes(q));
  }, [clientGroups, searchText]);

  /* ── delete payment ─────────────────────────────────── */
  const handleDeletePayment = async (payment) => {
    if (!window.confirm("Delete this payment record? This cannot be undone.")) return;
    try {
      await api.delete(`/payments/${payment._id}`, authHeaders);
      fetchData();
    } catch (err) {
      console.error("Failed to delete payment:", err);
      alert("Failed to delete payment.");
    }
  };

  /* ── render ─────────────────────────────────────────── */
  return (
    <div className="client-accounts">

      {/* toolbar */}
      <div className="ca-toolbar">
        <div>
          <h2>Client Accounts</h2>
          <p>Payment records grouped by client · * Our Client</p>
        </div>
        <input
          className="ca-search"
          type="text"
          placeholder="Search client name…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* groups */}
      <div className="ca-group-list">
        {loading ? (
          <div className="ca-card"><p className="ca-empty">Loading…</p></div>
        ) : filtered.length === 0 ? (
          <div className="ca-card"><p className="ca-empty">No clients found.</p></div>
        ) : (
          filtered.map((group) => {
            const total = totalForClient(group);
            return (
              <div className="ca-card" key={group.clientName}>
                {/* client header */}
                <div className="ca-client-header">
                  <div className="ca-client-info">
                    <span className="ca-client-name">{group.clientName}</span>
                    <span className="ca-total-badge">Total Paid: {fmtAmount(total)}</span>
                  </div>
                  <button
                    className="primary-btn ca-add-btn"
                    onClick={() => setPaymentModal({ clientCases: group.cases })}
                  >
                    + Add Payment
                  </button>
                </div>

                {/* cases */}
                {group.cases.map((c) => {
                  const casePayments = paymentsByCaseId[c._id] || [];
                  const caseTotal = casePayments.reduce((s, p) => s + p.amount, 0);
                  return (
                    <div className="ca-case-section" key={c._id}>
                      <div className="ca-case-header">
                        <div>
                          <span className="ca-case-label">
                            {c.caseNumber ? `${c.caseNumber} — ` : ""}{c.caseName}
                          </span>
                          {c.internalNotes && (
                            <p className="ca-payment-terms">{c.internalNotes}</p>
                          )}
                        </div>
                        <span className="ca-case-total">{fmtAmount(caseTotal)}</span>
                      </div>

                      {casePayments.length === 0 ? (
                        <p className="ca-empty ca-no-payments">No payments recorded for this case.</p>
                      ) : (
                        <table className="ca-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Amount</th>
                              <th>Method</th>
                              <th>Notes</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {casePayments.map((p) => (
                              <tr key={p._id}>
                                <td>{fmt(p.date)}</td>
                                <td className="ca-amount">{fmtAmount(p.amount)}</td>
                                <td>{p.paymentMethod}</td>
                                <td className="ca-notes">{p.notes || "—"}</td>
                                <td className="ca-actions">
                                  <button
                                    className="pencil-btn"
                                    title="Edit payment"
                                    onClick={() => setPaymentModal({ clientCases: group.cases, editingPayment: p })}
                                  >
                                    ✎
                                  </button>
                                  {isAdmin && (
                                    <button
                                      className="ca-delete-btn"
                                      title="Delete payment"
                                      onClick={() => handleDeletePayment(p)}
                                    >
                                      ×
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* payment modal */}
      {paymentModal && (
        <PaymentFormModal
          clientCases={paymentModal.clientCases}
          editingPayment={paymentModal.editingPayment || null}
          authHeaders={authHeaders}
          onClose={() => setPaymentModal(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default ClientAccounts;
