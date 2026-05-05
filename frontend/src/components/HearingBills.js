import React, { useState } from "react";
import api from "../services/api";
import * as XLSX from "xlsx";
import "../styles/HearingBills.css";

const toLocalDateStr = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmtDate = (dateVal) => {
  if (!dateVal) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateVal));
};

const HearingBills = () => {
  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState(null);
  const [groupOrder, setGroupOrder] = useState([]);

  // Both start empty — nothing checked by default.
  // Checking a case auto-adds all its hearings to checkedHearings.
  const [checkedCases, setCheckedCases] = useState(new Set());
  const [checkedHearings, setCheckedHearings] = useState(new Set());

  const handleSearch = async () => {
    if (!fromDate || !toDate) {
      alert("Please select both from and to dates.");
      return;
    }
    if (fromDate > toDate) {
      alert("From date must be before or equal to To date.");
      return;
    }

    try {
      setLoading(true);
      const [hearingsRes, casesRes] = await Promise.all([
        api.get("/hearings", authHeaders),
        api.get("/cases", authHeaders),
      ]);

      const allHearings = hearingsRes.data.data || [];
      const allCases = casesRes.data.data || [];

      const caseMap = {};
      allCases.forEach((c) => { caseMap[c._id] = c; });

      const filtered = allHearings.filter((h) => {
        const ds = toLocalDateStr(h.hearingDate);
        return ds && ds >= fromDate && ds <= toDate;
      });

      const grouped = {};
      const order = [];

      filtered.forEach((h) => {
        const caseId = (h.caseId?._id || h.caseId)?.toString();
        if (!caseId) return;
        if (!grouped[caseId]) {
          const caseData =
            h.caseId && typeof h.caseId === "object" ? h.caseId : (caseMap[caseId] || { _id: caseId });
          grouped[caseId] = { caseData, hearings: [] };
          order.push(caseId);
        }
        grouped[caseId].hearings.push(h);
      });

      Object.values(grouped).forEach((g) => {
        g.hearings.sort((a, b) => new Date(a.hearingDate) - new Date(b.hearingDate));
      });

      order.sort((a, b) => {
        const aReg = grouped[a]?.caseData?.registrationNumber || 0;
        const bReg = grouped[b]?.caseData?.registrationNumber || 0;
        return aReg - bReg;
      });

      setGroups(grouped);
      setGroupOrder(order);
      setCheckedCases(new Set());
      setCheckedHearings(new Set());
    } catch (err) {
      console.error("Failed to fetch data:", err);
      alert("Failed to fetch hearings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCase = (caseId) => {
    const g = groups[caseId];
    const hearingIds = g.hearings.map((h) => h._id);
    const wasChecked = checkedCases.has(caseId);

    setCheckedCases((prev) => {
      const next = new Set(prev);
      wasChecked ? next.delete(caseId) : next.add(caseId);
      return next;
    });

    setCheckedHearings((prev) => {
      const next = new Set(prev);
      if (wasChecked) {
        hearingIds.forEach((id) => next.delete(id));
      } else {
        hearingIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleHearing = (hearingId) => {
    setCheckedHearings((prev) => {
      const next = new Set(prev);
      next.has(hearingId) ? next.delete(hearingId) : next.add(hearingId);
      return next;
    });
  };

  const isHearingChecked = (hearingId) => checkedHearings.has(hearingId);

  const handleExport = () => {
    if (!groups) return;

    const checkedGroupIds = groupOrder.filter((id) => checkedCases.has(id));
    if (checkedGroupIds.length === 0) {
      alert("Please check at least one case to export.");
      return;
    }

    const header = [
      "Number",
      "Reg. No.",
      "Court Case No.",
      "Petitioner",
      "Defendant",
      "Court",
      "Judge",
      "Hearing Date",
      "Next Date",
      "Appeared By",
      "Verdict / Order",
      "Notes",
      "Clerkage Charge",
      "Amount"
    ];

    const allRows = [];
    checkedGroupIds.forEach((caseId) => {
      const { caseData: c, hearings } = groups[caseId];
      const selectedHearings = hearings.filter((h) => checkedHearings.has(h._id));
      selectedHearings.forEach((h) => {
        allRows.push([
          "",
          c.registrationNumber ?? "",
          c.caseNumber ?? "",
          c.petitioner ?? "",
          c.defendant ?? "",
          c.courtName ?? "",
          c.judgeName ?? "",
          fmtDate(h.hearingDate),
          h.nextHearingDate ? fmtDate(h.nextHearingDate) : "",
          h.appearedBy ?? "",
          h.hearingVerdict ?? "",
          h.hearingNotes ?? "",
          "",
        ]);
      });
    });

    if (allRows.length === 0) {
      alert("No hearings are checked for the selected cases.");
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...allRows]);

    // Bold every header cell
    header.forEach((_, col) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cellRef]) ws[cellRef].s = { font: { bold: true } };
    });

    ws["!cols"] = [
      { wch: 10 }, // Number
      { wch: 10 }, // Reg. No.
      { wch: 18 }, // Court Case No.
      { wch: 22 }, // Petitioner
      { wch: 22 }, // Defendant
      { wch: 16 }, // Court
      { wch: 20 }, // Judge
      { wch: 14 }, // Hearing Date
      { wch: 14 }, // Next Date
      { wch: 18 }, // Appeared By
      { wch: 28 }, // Verdict / Order
      { wch: 32 }, // Notes
      { wch: 16 }, // Clerkage Charge
      { wch: 12 }, // Amount
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Hearing Bills");
    XLSX.writeFile(wb, `Hearing_Bills_${fromDate}_to_${toDate}.xlsx`, { cellStyles: true });
  };

  const checkedCount = groupOrder.filter((id) => checkedCases.has(id)).length;

  return (
    <div className="hearing-bills">
      {/* Toolbar */}
      <div className="hb-toolbar">
        <div>
          <h2>Bills</h2>
          <p>Select a date range to view hearings by case, then export to Excel.</p>
        </div>
      </div>

      {/* Filter card */}
      <div className="hb-filter-card">
        <div className="hb-filter-row">
          <div className="hb-filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="hb-filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button
            className="primary-btn hb-search-btn"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? "Loading…" : "Search"}
          </button>
          {groups && checkedCount > 0 && (
            <button className="hb-export-btn" onClick={handleExport}>
              Export to Excel ({checkedCount} case{checkedCount !== 1 ? "s" : ""})
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {groups && (
        groupOrder.length === 0 ? (
          <div className="hb-empty-card">
            <p>No hearings found between {fmtDate(fromDate + "T00:00:00Z")} and {fmtDate(toDate + "T00:00:00Z")}.</p>
          </div>
        ) : (
          <div className="hb-group-list">
            {groupOrder.map((caseId) => {
              const { caseData: c, hearings } = groups[caseId];
              const isCaseChecked = checkedCases.has(caseId);
              return (
                <div
                  key={caseId}
                  className={`hb-case-card${isCaseChecked ? " hb-case-checked" : ""}`}
                >
                  {/* Case header row */}
                  <div className="hb-case-header">
                    <label className="hb-case-label">
                      <input
                        type="checkbox"
                        checked={isCaseChecked}
                        onChange={() => toggleCase(caseId)}
                      />
                      <span className="hb-case-title">
                        {c.registrationNumber ? `#${c.registrationNumber} · ` : ""}
                        {c.caseNumber ? `${c.caseNumber} — ` : ""}
                        {c.caseName || `${c.petitioner || "—"} V/S ${c.defendant || "—"}`}
                      </span>
                      <span className="hb-hearing-count">
                        {hearings.length} hearing{hearings.length !== 1 ? "s" : ""}
                      </span>
                    </label>
                    <div className="hb-case-meta">
                      {c.courtName && <span>{c.courtName}</span>}
                      {c.judgeName && <span>{c.judgeName}</span>}
                    </div>
                  </div>

                  {/* Hearings table */}
                  <div className="hb-table-wrapper">
                    <table className="hb-table">
                      <thead>
                        <tr>
                          <th className="hb-col-check"></th>
                          <th>Hearing Date</th>
                          <th>Next Date</th>
                          <th>Appeared By</th>
                          <th>Verdict / Order</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hearings.map((h) => {
                          const checked = isHearingChecked(h._id);
                          return (
                            <tr
                              key={h._id}
                              className={!checked ? "hb-row-unchecked" : ""}
                            >
                              <td className="hb-col-check">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!isCaseChecked}
                                  onChange={() => toggleHearing(h._id)}
                                />
                              </td>
                              <td>{fmtDate(h.hearingDate)}</td>
                              <td>{h.nextHearingDate ? fmtDate(h.nextHearingDate) : "—"}</td>
                              <td>{h.appearedBy || "—"}</td>
                              <td className="hb-col-verdict">{h.hearingVerdict || "—"}</td>
                              <td className="hb-col-notes">{h.hearingNotes || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default HearingBills;
