import React, { useState } from "react";
import api from "../services/api";
import "../styles/CaseManagement.css";

const METHODS = ["Cash", "Cheque", "Bank Transfer", "UPI", "Other"];

const PaymentFormModal = ({ clientCases, editingPayment, prefillData, authHeaders, onClose, onSuccess }) => {
  const isSingleCase = clientCases.length === 1;

  const [formData, setFormData] = useState({
    caseId:        editingPayment ? (editingPayment.caseId._id || editingPayment.caseId) : (prefillData?.caseId || (isSingleCase ? clientCases[0]._id : "")),
    date:          editingPayment ? editingPayment.date?.slice(0, 10) : (prefillData?.date || ""),
    amount:        editingPayment ? editingPayment.amount : (prefillData?.amount || ""),
    paymentMethod: editingPayment ? editingPayment.paymentMethod : (prefillData?.paymentMethod || "Cash"),
    notes:         editingPayment ? editingPayment.notes : (prefillData?.notes || ""),
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.caseId) { alert("Please select a case."); return; }
    if (!formData.date)   { alert("Please enter the payment date."); return; }
    if (!formData.amount || Number(formData.amount) <= 0) { alert("Please enter a valid amount."); return; }

    try {
      setLoading(true);
      const payload = {
        caseId:        formData.caseId,
        date:          formData.date,
        amount:        Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        notes:         formData.notes,
      };

      if (editingPayment) {
        await api.put(`/payments/${editingPayment._id}`, payload, authHeaders);
      } else {
        await api.post("/payments", payload, authHeaders);
      }

      await onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save payment:", err);
      alert(err.response?.data?.message || "Failed to save payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingPayment ? "Edit Payment" : "Add Payment Record"}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form className="case-form-grid" onSubmit={handleSubmit} style={{ padding: "20px 22px" }}>

          {/* Case selector — hidden if single case */}
          {!isSingleCase && (
            <div className="form-group full-width">
              <label>Case <span className="required-mark">*</span></label>
              <select name="caseId" value={formData.caseId} onChange={handleChange} required>
                <option value="">Select a case…</option>
                {clientCases.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.caseNumber ? `${c.caseNumber} — ` : ""}{c.caseName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date — no default */}
          <div className="form-group">
            <label>Payment Date <span className="required-mark">*</span></label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          {/* Amount */}
          <div className="form-group">
            <label>Amount (₹) <span className="required-mark">*</span></label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          {/* Payment Method */}
          <div className="form-group full-width">
            <label>Payment Method</label>
            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div className="form-group full-width">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Optional — e.g. advance payment, reference number..."
            />
          </div>

          <div className="modal-actions full-width">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving…" : editingPayment ? "Update" : "Add Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentFormModal;
