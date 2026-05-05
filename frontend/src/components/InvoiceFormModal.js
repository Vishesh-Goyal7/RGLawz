import React, { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import api from "../services/api";
import "../styles/CaseManagement.css";
import "../styles/InvoiceModal.css";

// ── Update this with the firm's actual PAN number ──────────────
const PAN_NUMBER = "ABCDE1234F";

// ── Financial year helpers ─────────────────────────────────────
const getFinancialYear = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const y1 = month >= 4 ? year : year - 1;
  const y2 = y1 + 1;
  return `${String(y1).slice(-2)}-${String(y2).slice(-2)}`;
};

const isInFinancialYear = (invoiceDateStr, fy) => {
  return getFinancialYear(invoiceDateStr) === fy;
};

// ── Number to words (Indian system) ───────────────────────────
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const belowHundred = (n) =>
  n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");

const belowThousand = (n) =>
  n < 100 ? belowHundred(n) : ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + belowHundred(n % 100) : "");

const numberToWords = (n) => {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "Zero";
  let result = "";
  if (n >= 10000000) { result += belowHundred(Math.floor(n / 10000000)) + " Crore "; n %= 10000000; }
  if (n >= 100000)   { result += belowHundred(Math.floor(n / 100000)) + " Lakh "; n %= 100000; }
  if (n >= 1000)     { result += belowHundred(Math.floor(n / 1000)) + " Thousand "; n %= 1000; }
  if (n > 0)         { result += belowThousand(n); }
  return result.trim();
};

// ── PDF generation ─────────────────────────────────────────────
const buildInvoicePDF = (invoiceNumber, clientDetail, selectedCase, items) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const CM       = 28.3465;
  const mTop     = 4    * CM;
  const mBot     = 2.54 * CM;
  const mLeft    = 4.3  * CM;
  const mRight   = 2.54 * CM;
  const contentW = pageW - mLeft - mRight;

  let y = mTop;

  // ─── HEADER ────────────────────────────────────────────────
  // Firm name: times bold (matches cause list font-weight:bold, no italic)
  doc.setFont("times", "bold");
  doc.setFontSize(36);
  doc.text("RGLawz", pageW / 2, y, { align: "center" });
  y += 42;

  // Tagline: times bolditalic (matches cause list bold + italic)
  doc.setFont("times", "bolditalic");
  doc.setFontSize(13);
  doc.text("ADVOCATES & LEGAL CONSULTANTS", pageW / 2, y, { align: "center" });
  y += 26;

  // ─── INVOICE META ───────────────────────────────────────────
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text(invoiceNumber, mLeft, y);
  y += 18;

  const clientName =
    clientDetail?.name ||
    (selectedCase?.ourClient === "petitioner" ? selectedCase?.petitioner : selectedCase?.defendant) ||
    "";
  doc.setFont("times", "bold");
  doc.text(clientName, mLeft, y);
  y += 18;

  if (clientDetail?.address?.trim()) {
    doc.setFont("times", "normal");
    const addrLines = doc.splitTextToSize(clientDetail.address.trim().toUpperCase(), contentW);
    doc.text(addrLines, mLeft, y);
    y += addrLines.length * 14;
  }
  y += 8;

  // "PROFESSIONAL BILL" centred, bold, underlined
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  const titleText = "PROFESSIONAL BILL";
  const titleW = doc.getTextWidth(titleText);
  const titleX = (pageW - titleW) / 2;
  doc.text(titleText, titleX, y);
  doc.setLineWidth(0.5);
  doc.line(titleX, y + 2, titleX + titleW, y + 2);
  y += 22;

  // ─── TABLE ─────────────────────────────────────────────────
  const tblFontSize = 11;
  const lineH = 14; // px per wrapped line
  const vPad  = 8;  // top+bottom padding inside each cell
  const snoW  = 40;
  const amtW  = 100;
  const partW = contentW - snoW - amtW;
  const xSno  = mLeft;
  const xPart = mLeft + snoW;
  const xAmt  = mLeft + snoW + partW;

  doc.setFontSize(tblFontSize);

  // Draws one row, returns the row height used so caller can advance y
  const drawRow = (snoTxt, partTxt, amtTxt, fontStyle) => {
    doc.setFont("times", fontStyle);
    const snoLines  = doc.splitTextToSize(String(snoTxt),  snoW  - 12);
    const partLines = doc.splitTextToSize(String(partTxt), partW - 12);
    const amtLines  = doc.splitTextToSize(String(amtTxt),  amtW  - 12);
    const maxLines  = Math.max(snoLines.length, partLines.length, amtLines.length, 1);
    const rH        = maxLines * lineH + vPad * 2;
    const baseY     = y + vPad + lineH; // baseline of first line
    doc.rect(xSno,  y, snoW,  rH);
    doc.rect(xPart, y, partW, rH);
    doc.rect(xAmt,  y, amtW,  rH);
    doc.text(snoLines,  xSno  + 6, baseY);
    doc.text(partLines, xPart + 6, baseY);
    doc.text(amtLines,  xAmt  + 6, baseY);
    return rH;
  };

  y += drawRow("S.NO.", "PARTICULARS", "AMOUNT", "bold");

  items.forEach((item, idx) => {
    const amt = Number(item.amount) || 0;
    y += drawRow(`${idx + 1}.`, item.particulars || "", `Rs. ${amt.toLocaleString("en-IN")}`, "normal");
  });

  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  y += drawRow("", numberToWords(total) + " Rupees Only", `Rs. ${total.toLocaleString("en-IN")}`, "bold");
  y += 16;

  // ─── PAN & SIGNATORY ───────────────────────────────────────
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text(`PAN NO. ${PAN_NUMBER}`, mLeft, y); y += 18;
  doc.text("Cheque be issued in the name of", mLeft, y); y += 18;
  doc.text("Mukesh Mohan Goyal", mLeft, y); y += 36;

  doc.setFont("times", "bold");
  doc.text("(MUKESH M. GOEL)", pageW - mRight, y, { align: "right" }); y += 18;
  doc.setFont("times", "normal");
  doc.text("ADVOCATE", pageW - mRight, y, { align: "right" });

  // ─── FOOTER (pinned to bottom margin) ──────────────────────
  const footerY = pageH - mBot - 68;
  doc.setLineWidth(0.8);
  doc.line(mLeft, footerY, pageW - mRight, footerY);

  doc.setFont("times", "bolditalic");
  doc.setFontSize(14);
  doc.text("Office", pageW / 2, footerY + 16, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.text("17A/35, 1st Floor, West Punjabi Bagh, New Delhi-110026", pageW / 2, footerY + 32, { align: "center" });
  doc.text("9810910312", pageW / 2, footerY + 47, { align: "center" });
  doc.text("officeofrglawz@gmail.com", pageW / 2, footerY + 62, { align: "center" });

  return doc;
};

// ── Component ──────────────────────────────────────────────────
const InvoiceFormModal = ({ clientCases, authHeaders, onClose, onSuccess }) => {
  const today = new Date().toISOString().slice(0, 10);

  const [selectedCaseId, setSelectedCaseId] = useState(
    clientCases.length === 1 ? clientCases[0]._id : ""
  );
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [items, setItems] = useState([{ particulars: "", amount: "" }]);
  const [clientDetail, setClientDetail] = useState(null);
  const [clientDetailLoading, setClientDetailLoading] = useState(false);
  const [addressInput, setAddressInput] = useState("");

  // Client-level invoice history (across all cases of this client)
  const [clientInvoices, setClientInvoices] = useState([]);
  const [clientCode, setClientCode] = useState("");
  const [clientCodeLocked, setClientCodeLocked] = useState(false); // true once found from DB

  const [loading, setLoading] = useState(false);

  // Fetch clientDetail for selected case
  useEffect(() => {
    if (!selectedCaseId) { setClientDetail(null); setAddressInput(""); return; }
    setClientDetailLoading(true);
    setAddressInput("");
    api.get(`/client-details/case/${selectedCaseId}`, authHeaders)
      .then((res) => setClientDetail(res.data.data || null))
      .catch(() => setClientDetail(null))
      .finally(() => setClientDetailLoading(false));
  }, [selectedCaseId]); // eslint-disable-line

  // Fetch all invoices for this client's cases to get clientCode + count
  const fetchClientInvoices = useCallback(async () => {
    if (!clientCases || clientCases.length === 0) return;
    try {
      const caseIds = clientCases.map((c) => c._id).join(",");
      const res = await api.get(`/invoices?caseIds=${caseIds}`, authHeaders);
      const invoices = res.data.data || [];
      setClientInvoices(invoices);

      // Try to find an existing client code
      const found = invoices.find((inv) => inv.clientCode);
      if (found) {
        setClientCode(found.clientCode);
        setClientCodeLocked(true);
      }
    } catch (err) {
      console.error("Failed to fetch client invoices:", err);
    }
  }, [clientCases]); // eslint-disable-line

  useEffect(() => { fetchClientInvoices(); }, [fetchClientInvoices]);

  // Compute invoice number
  const fy = useMemo(() => getFinancialYear(invoiceDate), [invoiceDate]);

  const invoiceSeq = useMemo(() => {
    if (!fy) return 0;
    return clientInvoices.filter((inv) => isInFinancialYear(inv.invoiceDate, fy)).length + 1;
  }, [clientInvoices, fy]);

  const computedInvoiceNumber = useMemo(() => {
    if (!clientCode.trim() || !fy) return null;
    return `MG/${fy}/${clientCode.trim().toUpperCase()}/${String(invoiceSeq).padStart(3, "0")}`;
  }, [clientCode, fy, invoiceSeq]);

  // Items helpers
  const addItem = () => setItems((prev) => [...prev, { particulars: "", amount: "" }]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const selectedCase = clientCases.find((c) => c._id === selectedCaseId);

  const handleSubmit = async () => {
    if (!selectedCaseId) { alert("Please select a case."); return; }
    if (!invoiceDate) { alert("Please enter an invoice date."); return; }
    if (!clientCode.trim()) { alert("Please enter a client code (e.g. AA)."); return; }
    if (items.some((i) => !i.particulars.trim() || !i.amount || Number(i.amount) <= 0)) {
      alert("Please fill in particulars and a valid amount for each item."); return;
    }
    if (!clientDetail) {
      alert("No client details found for this case. Please add client details first."); return;
    }
    const effectiveAddress = clientDetail.address?.trim() || addressInput.trim();
    if (!effectiveAddress) {
      alert("Please enter the client's address."); return;
    }

    try {
      setLoading(true);

      // Save address to DB if it was missing and user just entered it
      let pdfClientDetail = clientDetail;
      if (!clientDetail.address?.trim() && addressInput.trim()) {
        await api.put(`/client-details/${clientDetail._id}`, { address: addressInput.trim() }, authHeaders);
        pdfClientDetail = { ...clientDetail, address: addressInput.trim() };
      }

      const invoiceNumber = computedInvoiceNumber;
      const doc = buildInvoicePDF(invoiceNumber, pdfClientDetail, selectedCase, items);
      const pdfBlob = doc.output("blob");

      const formData = new FormData();
      formData.append("caseId", selectedCaseId);
      formData.append("clientDetailId", clientDetail._id);
      formData.append("invoiceDate", invoiceDate);
      formData.append("amount", total);
      formData.append("status", "Due");
      formData.append("invoiceNumber", invoiceNumber);
      formData.append("clientCode", clientCode.trim().toUpperCase());
      formData.append("items", JSON.stringify(items.map((i) => ({ particulars: i.particulars.trim(), amount: Number(i.amount) }))));
      formData.append("file", pdfBlob, `${invoiceNumber.replace(/\//g, "-")}.pdf`);

      await api.post("/invoices", formData, {
        headers: { ...authHeaders.headers, "Content-Type": "multipart/form-data" },
      });

      // Open PDF for printing
      const blobUrl = URL.createObjectURL(pdfBlob);
      const win = window.open(blobUrl, "_blank");
      if (win) win.focus();

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to create invoice:", err);
      alert(err.response?.data?.message || "Failed to create invoice.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card inv-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Invoice</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="inv-form-body">
          {/* Row 1: Case selector */}
          <div className="form-group full-width">
            <label>Case <span className="required-mark">*</span></label>
            <select value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)}>
              <option value="">Select a case…</option>
              {clientCases.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.caseNumber ? `${c.caseNumber} — ` : ""}{c.caseName || `${c.petitioner} V/S ${c.defendant}`}
                </option>
              ))}
            </select>
            {selectedCaseId && clientDetailLoading && (
              <p className="inv-hint">Loading client details…</p>
            )}
            {selectedCaseId && !clientDetailLoading && !clientDetail && (
              <p className="inv-hint inv-hint-warn">No client details found for this case. Add them in Client Details first.</p>
            )}
            {clientDetail && (
              <p className="inv-hint">
                Client: <strong>{clientDetail.name}</strong>
                {clientDetail.address?.trim()
                  ? ` · ${clientDetail.address}`
                  : <span className="inv-hint-warn"> · No address on file</span>}
              </p>
            )}
          </div>

          {/* Address input — only shown when clientDetail has no address */}
          {clientDetail && !clientDetail.address?.trim() && (
            <div className="form-group full-width">
              <label>
                Client Address <span className="required-mark">*</span>
                <span className="inv-code-locked"> (will be saved to client details)</span>
              </label>
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="e.g. 12A, Sector 5, New Delhi - 110001"
              />
            </div>
          )}

          {/* Row 2: Invoice date + Client code + Computed invoice number */}
          <div className="inv-date-code-row">
            <div className="form-group">
              <label>Invoice Date <span className="required-mark">*</span></label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
              {fy && <p className="inv-hint">FY {fy}</p>}
            </div>

            <div className="form-group">
              <label>
                Client Code <span className="required-mark">*</span>
                {clientCodeLocked && (
                  <span className="inv-code-locked"> (from past invoices)</span>
                )}
              </label>
              <input
                type="text"
                value={clientCode}
                onChange={(e) => !clientCodeLocked && setClientCode(e.target.value)}
                placeholder="e.g. AA"
                maxLength={8}
                readOnly={clientCodeLocked}
                className={clientCodeLocked ? "inv-input-readonly" : ""}
              />
            </div>

            <div className="form-group">
              <label>Invoice Number</label>
              <input
                type="text"
                value={computedInvoiceNumber || "—"}
                readOnly
                className="inv-input-readonly"
              />
              <p className="inv-hint">#{invoiceSeq} invoice for this client in FY {fy || "—"}</p>
            </div>
          </div>

          {/* Items */}
          <div className="inv-items-section">
            <div className="inv-items-header">
              <span>Items</span>
              <button type="button" className="inv-add-item-btn" onClick={addItem}>
                + Add Item
              </button>
            </div>

            <div className="inv-items-list">
              <div className="inv-items-row inv-items-head">
                <span className="inv-col-sno">S.NO.</span>
                <span className="inv-col-part">PARTICULARS</span>
                <span className="inv-col-amt">AMOUNT (₹)</span>
                <span className="inv-col-del"></span>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="inv-items-row">
                  <span className="inv-col-sno inv-sno-num">{idx + 1}.</span>
                  <input
                    className="inv-col-part"
                    type="text"
                    value={item.particulars}
                    onChange={(e) => updateItem(idx, "particulars", e.target.value)}
                    placeholder="Particulars…"
                  />
                  <input
                    className="inv-col-amt"
                    type="number"
                    value={item.amount}
                    onChange={(e) => updateItem(idx, "amount", e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                  <span className="inv-col-del">
                    {items.length > 1 && (
                      <button
                        type="button"
                        className="inv-del-item-btn"
                        onClick={() => removeItem(idx)}
                        title="Remove item"
                      >×</button>
                    )}
                  </span>
                </div>
              ))}

              {/* Total row */}
              <div className="inv-items-row inv-total-row">
                <span className="inv-col-sno"></span>
                <span className="inv-col-part inv-total-words">
                  {total > 0 ? numberToWords(total) + " Rupees Only" : ""}
                </span>
                <span className="inv-col-amt inv-total-amt">
                  {total > 0 ? `₹ ${total.toLocaleString("en-IN")}` : "—"}
                </span>
                <span className="inv-col-del"></span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="primary-btn"
              onClick={handleSubmit}
              disabled={loading || !computedInvoiceNumber || !clientDetail}
            >
              {loading ? "Creating…" : "Create Invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceFormModal;
