import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import HearingFormModal from "./HearingFormModal";
import "../styles/CauseList.css";

/* ── helpers ─────────────────────────────────────────── */
const toLocalDateStr = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDisplay = (dateVal) => {
  if (!dateVal) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateVal));
};

/* ── shared table ────────────────────────────────────── */
const HearingTable = ({ rows, isPast, isOverdue = false, modalDate, onUpdate, hearingLoading, allHearings = [], today = "" }) => {
  const isToday = modalDate === today;
  return (
  <table className={`cl-table${isOverdue ? " cl-table-overdue" : ""}`}>
    <thead>
      <tr>
        <th className="cl-col-date">{isPast ? "Hearing Date" : "Previous Hearing Date"}</th>
        <th className="cl-col-judge">Judge</th>
        <th className="cl-col-party">Petitioner</th>
        <th className="cl-col-party">Defendant</th>
        <th className="cl-col-verdict">Verdict</th>
        {isPast && <th className="cl-col-date">Next Date</th>}
        <th className="cl-col-action">{isToday ? "Next Date" : "Action"}</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((item) => {
        const prevDate = item.previousHearingDate || null;
        const verdict  = item.latestHearingId?.hearingVerdict || "—";
        // isOverdueTip: case appears on this past date because its chain tip (not a completed hearing) is overdue
        const isOverdueTip = isPast && toLocalDateStr(item.latestHearingId?.hearingDate) === modalDate;
        const showUpdate = isOverdue ? true : (isPast ? (!item.nextHearingDate || isOverdueTip) : true);

        // For past and today non-overdue rows: find the hearing that actually occurred on modalDate
        const specificHearing = (isPast || isToday) && !isOverdue && modalDate
          ? allHearings.find(h =>
              toLocalDateStr(h.hearingDate) === modalDate &&
              (h.caseId?._id || h.caseId)?.toString() === item._id?.toString()
            )
          : null;

        const isDoneToday = isToday && !isOverdue && specificHearing?.hearingStatus === "done" && !!specificHearing?.nextHearingDate;

        // Determine the next date to display in the Next Date column
        const nextDateNode = (() => {
          if (isOverdue) return <span className="cl-update-pending">Update Pending</span>;
          if (specificHearing) {
            const isLatest = item.latestHearingId?._id?.toString() === specificHearing._id?.toString();
            const tipDate  = toLocalDateStr(item.latestHearingId?.hearingDate);
            if (isLatest && tipDate && tipDate < today)
              return <span className="cl-update-pending">Update Pending</span>;
            return specificHearing.nextHearingDate
              ? formatDisplay(specificHearing.nextHearingDate)
              : "—";
          }
          return item.nextHearingDate ? formatDisplay(item.nextHearingDate) : "—";
        })();

        return (
          <tr key={item._id} className={isOverdue ? "cl-row-overdue" : ""}>
            <td className="cl-col-date">
              <span className="cl-truncate">
                {formatDisplay(prevDate)}
              </span>
            </td>
            <td className="cl-col-judge">
              <span className="cl-truncate" title={item.judgeName}>{item.judgeName || "—"}</span>
              {item.courtName && (
                <span className="cl-court-name">({item.courtName})</span>
              )}
            </td>
            <td className="cl-col-party">
              <span className="cl-truncate" title={item.petitioner}>
                {item.petitioner || "—"}
                {item.ourClient === "petitioner" && <span className="our-client-mark" title="Our Client"> *</span>}
              </span>
            </td>
            <td className="cl-col-party">
              <span className="cl-truncate" title={item.defendant}>
                {item.defendant || "—"}
                {item.ourClient === "defendant" && <span className="our-client-mark" title="Our Client"> *</span>}
              </span>
            </td>
            <td className="cl-col-verdict">
              <span className="cl-verdict-text">{verdict}</span>
            </td>
            {isPast && (
              <td className="cl-col-date">
                <span className="cl-truncate">{nextDateNode}</span>
              </td>
            )}
            <td className="cl-col-action">
              {isDoneToday ? (
                <span className="cl-next-date-chip">{formatDisplay(specificHearing.nextHearingDate)}</span>
              ) : showUpdate && (
                <button
                  className="cl-update-btn"
                  onClick={() => onUpdate(item)}
                  disabled={hearingLoading}
                >
                  Update
                </button>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
  );
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/* ── main component ──────────────────────────────────── */
const CauseList = () => {
  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;

  const [cases, setCases]       = useState([]);
  const [allHearings, setAllHearings] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const [modalDate, setModalDate]           = useState(null);
  const [overdueModalOpen, setOverdueModalOpen] = useState(false);
  const [hearingLoading, setHearingLoading] = useState(false);
  const [updatingHearing, setUpdatingHearing] = useState(null);
  const [hearingModalOpen, setHearingModalOpen] = useState(false);

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      const [casesRes, hearingsRes] = await Promise.all([
        api.get("/cases", authHeaders),
        api.get("/hearings", authHeaders),
      ]);
      setCases(casesRes.data.data || []);
      setAllHearings(hearingsRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  /* ── chain model: overdue detection ─────────────────── */
  // latestHearingId is always the chain tip.
  // tip date in past → overdue. No tip but past previousHearingDate → also overdue.
  const isOverdueCase = (c) => {
    if (c.caseStatus !== "active") return false;
    const tip = c.latestHearingId;
    if (tip) {
      const tipDate = toLocalDateStr(tip.hearingDate);
      return !!tipDate && tipDate < today;
    }
    const prevDate = toLocalDateStr(c.previousHearingDate);
    return !!prevDate && prevDate < today;
  };

  /* ── date maps driven by the chain ──────────────────── */
  const futureCountByDate = {};

  cases.forEach((c) => {
    const tipDate = toLocalDateStr(c.latestHearingId?.hearingDate);
    if (tipDate && tipDate > today) {
      futureCountByDate[tipDate] = (futureCountByDate[tipDate] || 0) + 1;
    }
  });

  // Total hearings per date from allHearings — used for past + today badge counts
  const hearingCountByDate = {};
  allHearings.forEach((h) => {
    const ds = toLocalDateStr(h.hearingDate);
    if (ds) hearingCountByDate[ds] = (hearingCountByDate[ds] || 0) + 1;
  });

  const overdueCases = cases
    .filter(isOverdueCase)
    .sort((a, b) => {
      const aDate = a.nextHearingDate || a.latestHearingId?.hearingDate;
      const bDate = b.nextHearingDate || b.latestHearingId?.hearingDate;
      return new Date(aDate) - new Date(bDate);
    });

  // Count of still-pending (not updated) hearings per past date
  const pendingCountByDate = {};
  overdueCases.forEach((c) => {
    const tipDate = c.latestHearingId
      ? toLocalDateStr(c.latestHearingId.hearingDate)
      : toLocalDateStr(c.previousHearingDate);
    if (tipDate) pendingCountByDate[tipDate] = (pendingCountByDate[tipDate] || 0) + 1;
  });

  /* ── calendar helpers ────────────────────────────────── */
  const countForDate = (ds) => {
    if (!ds) return 0;
    if (ds <= today) return hearingCountByDate[ds] || 0;
    return futureCountByDate[ds] || 0;
  };

  const casesForDate = (ds) => {
    if (!ds) return [];
    if (ds <= today) {
      // Past + today: use full hearings list so completed hearings stay visible
      const caseIdsOnDate = new Set(
        allHearings
          .filter((h) => toLocalDateStr(h.hearingDate) === ds)
          .map((h) => (h.caseId?._id || h.caseId)?.toString())
          .filter(Boolean)
      );
      return cases.filter((c) => caseIdsOnDate.has(c._id?.toString()));
    }
    // Future: match on the chain tip's date
    return cases.filter((c) => toLocalDateStr(c.latestHearingId?.hearingDate) === ds);
  };

  const modalCases      = casesForDate(modalDate).sort((a, b) => {
    const aD = a.previousHearingDate ? new Date(a.previousHearingDate) : null;
    const bD = b.previousHearingDate ? new Date(b.previousHearingDate) : null;
    if (!aD && !bD) return 0;
    if (!aD) return 1;
    if (!bD) return -1;
    return aD - bD;
  });
  const isPastModal     = modalDate && modalDate < today;
  const isTodayModal    = modalDate === today;
  const pendingInModal  = overdueCases.filter(
    (c) => !modalCases.some((m) => m._id === c._id)
  );

  /* ── modal date navigation ───────────────────────────── */
  const allActiveDates = useMemo(() => {
    const dateSet = new Set();
    allHearings.forEach((h) => {
      const ds = toLocalDateStr(h.hearingDate);
      if (ds) dateSet.add(ds);
    });
    cases.forEach((c) => {
      const tipDate = toLocalDateStr(c.latestHearingId?.hearingDate);
      if (tipDate && tipDate >= today) dateSet.add(tipDate);
    });
    return [...dateSet].sort();
  }, [allHearings, cases, today]);

  const modalDateIdx = modalDate ? allActiveDates.indexOf(modalDate) : -1;
  const prevNavDate  = modalDateIdx > 0 ? allActiveDates[modalDateIdx - 1] : null;
  const nextNavDate  = modalDateIdx !== -1 && modalDateIdx < allActiveDates.length - 1
    ? allActiveDates[modalDateIdx + 1] : null;

  const navigateToDate = (dateStr) => {
    if (!dateStr) return;
    const [y, m] = dateStr.split("-").map(Number);
    setCalYear(y);
    setCalMonth(m - 1);
    setModalDate(dateStr);
  };

  /* ── print ───────────────────────────────────────────── */
  const handlePrint = () => {
    const displayDate = formatDisplay(modalDate + "T00:00:00Z");

    const buildRows = (rows) =>
      rows.map((item) => {
        const prevDate = item.previousHearingDate
          ? formatDisplay(item.previousHearingDate)
          : "N/A";
        const petitioner = item.petitioner || "—";
        const defendant  = item.defendant  || "—";
        const markP = item.ourClient === "petitioner"
          ? ' <span style="color:red;font-weight:700">*</span>' : "";
        const markD = item.ourClient === "defendant"
          ? ' <span style="color:red;font-weight:700">*</span>' : "";
        const parties = `${petitioner}${markP} V/S ${defendant}${markD}`;
        const judgeCell = item.courtName
          ? `${item.judgeName || "—"}<br/><span style="font-size:10pt;color:#555">(${item.courtName})</span>`
          : (item.judgeName || "—");
        return `<tr>
          <td>${prevDate}</td>
          <td>${judgeCell}</td>
          <td>${parties}</td>
          <td></td>
          <td></td>
        </tr>`;
      }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Cause List - ${displayDate}</title>
  <style>
    @page { margin: 0; }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body { height: 100%; }

    body {
      font-family: 'Bookman Old Style', 'Book Antiqua', Georgia, serif;
      font-size: 12pt;
      color: #000;
    }

    /* ── outer page layout table ── */
    .page-wrap {
      width: 100%;
      min-height: 100%;
      border-collapse: collapse;
    }

    /* thead cell: firm header */
    .page-wrap > thead > tr > td {
      padding: 24px 40px 14px;
      text-align: center;
    }

    /* tfoot cell: office footer — sits at bottom of every page */
    .page-wrap > tfoot > tr > td {
      padding: 0 40px 18px;
      text-align: center;
    }

    /* tbody cell: hearing data */
    .page-wrap > tbody > tr > td {
      padding: 0 40px;
      vertical-align: top;
    }

    /* ── firm header ── */
    .firm-name {
      font-family: 'Monotype Corsiva', 'Apple Chancery', cursive;
      font-size: 36pt;
      font-weight: bold;
      display: block;
      line-height: 1.15;
    }

    .firm-tagline {
      font-family: 'Monotype Corsiva', 'Apple Chancery', cursive;
      font-size: 13pt;
      font-weight: bold;
      font-style: italic;
      display: block;
      margin-bottom: 8px;
    }

    .title-row {
      display: flex;
      align-items: baseline;
      justify-content: center;
      position: relative;
    }

    .cause-title {
      font-family: 'Bookman Old Style', 'Book Antiqua', Georgia, serif;
      font-size: 12pt;
      font-weight: bold;
      text-decoration: underline;
    }

    .cause-date {
      font-family: 'Bookman Old Style', 'Book Antiqua', Georgia, serif;
      font-size: 12pt;
      position: absolute;
      right: 0;
    }

    /* ── hearing data table ── */
    .hearing-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'Bookman Old Style', 'Book Antiqua', Georgia, serif;
      font-size: 12pt;
      margin-top: 12px;
    }

    .hearing-table th {
      font-weight: bold;
      text-align: left;
      padding: 6px 10px;
      border: none;
    }

    .hearing-table td {
      padding: 6px 10px;
      border: none;
      vertical-align: top;
    }

    /* ── footer ── */
    .footer-line {
      border: none;
      border-top: 2px solid #000;
      margin-bottom: 6px;
    }

    .footer-office {
      font-family: 'Monotype Corsiva', 'Apple Chancery', cursive;
      font-size: 17pt;
      font-weight: bold;
      display: block;
      line-height: 1.3;
    }

    .footer-info {
      font-family: 'Monotype Corsiva', 'Apple Chancery', cursive;
      font-size: 13pt;
      display: block;
      line-height: 1.45;
    }

    .footer-info a {
      color: #000;
      text-decoration: none;
    }
  </style>
</head>
<body>

  <table class="page-wrap">
    <thead>
      <tr><td>
        <span class="firm-name">RGLawz</span>
        <span class="firm-tagline">ADVOCATES &amp; LEGAL CONSULTANTS</span>
        <div class="title-row">
          <span class="cause-title">CAUSE LIST</span>
          <span class="cause-date">${displayDate}</span>
        </div>
      </td></tr>
    </thead>
    <tfoot>
      <tr><td>
        <hr class="footer-line"/>
        <span class="footer-office">Office</span>
        <span class="footer-info">17A/35, 1st Floor, West Punjabi Bagh, New Delhi-110026</span>
        <span class="footer-info">9810910312</span>
        <span class="footer-info"><a href="mailto:officeofrglawz@gmail.com">officeofrglawz@gmail.com</a></span>
      </td></tr>
    </tfoot>
    <tbody>
      <tr><td>
        <table class="hearing-table">
          <thead>
            <tr>
              <th>PDOH</th>
              <th>Judge</th>
              <th>Parties</th>
              <th>NDOH</th>
              <th>Mark To</th>
            </tr>
          </thead>
          <tbody>
            ${modalCases.length > 0
              ? buildRows(modalCases)
              : `<tr><td colspan="5" style="color:#aaa;padding-top:12px">No hearings scheduled for this date.</td></tr>`}
          </tbody>
        </table>
      </td></tr>
    </tbody>
  </table>

</body>
</html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const cellDateStr = (day) =>
    day ? `${calYear}-${String(calMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}` : null;

  /* ── update hearing ──────────────────────────────────── */
  const handleUpdateClick = async (caseItem) => {
    try {
      setHearingLoading(true);
      const res = await api.get(`/hearings?caseId=${caseItem._id}`, authHeaders);
      const hearings = res.data.data || [];

      let target = hearings.find(
        (h) => h.hearingStatus === "upcoming" &&
               toLocalDateStr(h.hearingDate) === toLocalDateStr(caseItem.nextHearingDate)
      );
      if (!target) target = hearings.find((h) => h.hearingStatus === "upcoming");
      if (!target && modalDate)
        target = hearings.find((h) => toLocalDateStr(h.hearingDate) === modalDate);
      if (!target && hearings.length > 0)
        target = [...hearings].sort((a, b) => new Date(b.hearingDate) - new Date(a.hearingDate))[0];

      if (!target) { alert("No hearing record found for this case."); return; }

      setUpdatingHearing(target);
      setHearingModalOpen(true);
    } catch (err) {
      console.error("Failed to load hearing:", err);
      alert("Failed to load hearing details.");
    } finally {
      setHearingLoading(false);
    }
  };

  const closeHearingModal = () => {
    setHearingModalOpen(false);
    setUpdatingHearing(null);
  };

  /* ── render ──────────────────────────────────────────── */
  return (
    <div className="cause-list">

      {/* toolbar */}
      <div className="cl-toolbar">
        <div>
          <h2>Cause List</h2>
          <p>Past dates show hearings by last hearing date · Today &amp; future show hearings by next hearing date.</p>
        </div>
        <div className="cl-cal-nav">
          <button className="cl-nav-btn" onClick={prevMonth}>‹</button>
          <span className="cl-month-label">{MONTHS[calMonth]} {calYear}</span>
          <button className="cl-nav-btn" onClick={nextMonth}>›</button>
        </div>
      </div>

      {/* ── overdue alert banner ── */}
      {!loading && overdueCases.length > 0 && (
        <button className="cl-overdue-banner" onClick={() => setOverdueModalOpen(true)}>
          <span className="cl-overdue-shine">
            {overdueCases.length} Hearing{overdueCases.length !== 1 ? "s" : ""} to be Updated
          </span>
          <span className="cl-overdue-cta">Click to Update →</span>
        </button>
      )}

      {/* calendar */}
      <div className="cl-calendar-card">
        <div className="cl-cal-grid">
          {DAYS.map((d) => (
            <div key={d} className="cl-day-name">{d}</div>
          ))}
          {cells.map((day, idx) => {
            const ds           = cellDateStr(day);
            const count        = countForDate(ds);
            const isToday      = ds === today;
            const isPast       = ds && ds < today;
            const pendingCount = isPast ? (pendingCountByDate[ds] || 0) : 0;
            const doneCount    = isPast ? count - pendingCount : count;
            return (
              <div
                key={idx}
                className={[
                  "cl-day-cell",
                  !day      ? "cl-day-empty"    : "",
                  isToday   ? "cl-day-today"    : "",
                  isPast    ? "cl-day-past"     : "",
                  count > 0 ? "cl-day-has-cases": "",
                ].join(" ").trim()}
                onClick={() => day && setModalDate(ds)}
              >
                {day && (
                  <>
                    <span className="cl-day-num">{day}</span>
                    {count > 0 && (
                      isPast ? (
                        <div className="cl-badge-group">
                          {doneCount > 0 && (
                            <span className="cl-case-badge cl-badge-past">{doneCount}</span>
                          )}
                          {doneCount > 0 && pendingCount > 0 && (
                            <span className="cl-badge-sep">+</span>
                          )}
                          {pendingCount > 0 && (
                            <span className="cl-case-badge cl-badge-pending">{pendingCount} pending</span>
                          )}
                        </div>
                      ) : (
                        <span className="cl-case-badge">{count}</span>
                      )
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── date modal ── */}
      {modalDate && (
        <div className="modal-overlay" onClick={() => setModalDate(null)}>
          <div className="modal-card cl-date-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {isTodayModal
                  ? "Today's Hearings"
                  : `${isPastModal ? "Hearings held on" : "Hearings on"} ${formatDisplay(modalDate + "T00:00:00Z")}`}
                <span className="cl-list-count">{modalCases.length}</span>
              </h3>
              <div className="cl-modal-header-actions">
                <button
                  className="cl-nav-btn"
                  onClick={() => navigateToDate(prevNavDate)}
                  disabled={!prevNavDate}
                  title={prevNavDate ? formatDisplay(prevNavDate + "T00:00:00Z") : "No earlier date"}
                >‹</button>
                <button
                  className="cl-nav-btn"
                  onClick={() => navigateToDate(nextNavDate)}
                  disabled={!nextNavDate}
                  title={nextNavDate ? formatDisplay(nextNavDate + "T00:00:00Z") : "No later date"}
                >›</button>
                <button className="cl-print-btn" title="Print cause list" onClick={handlePrint}>
                  🖨 Print
                </button>
                <button className="close-btn" onClick={() => setModalDate(null)}>×</button>
              </div>
            </div>
            {loading ? (
              <p className="cl-empty">Loading…</p>
            ) : (
              <div className="cl-table-wrapper">
                {/* Scheduled hearings for this date */}
                <div className="cl-section-label">
                  {isTodayModal ? "Today's Schedule" : isPastModal ? "Hearings on this Date" : "Scheduled Hearings"}
                  <span className="cl-list-count">{modalCases.length}</span>
                </div>
                {modalCases.length === 0 ? (
                  <p className="cl-empty">No hearings scheduled for this date.</p>
                ) : (
                  <HearingTable
                    rows={modalCases}
                    isPast={isPastModal}
                    modalDate={modalDate}
                    onUpdate={handleUpdateClick}
                    hearingLoading={hearingLoading}
                    allHearings={allHearings}
                    today={today}
                  />
                )}

                {/* Pending (overdue) cases */}
                {pendingInModal.length > 0 && (
                  <>
                    <div className="cl-section-label cl-section-overdue">
                      Pending Updates from Before
                      <span className="cl-list-count cl-count-overdue">{pendingInModal.length}</span>
                    </div>
                    <HearingTable
                      rows={pendingInModal}
                      isPast={true}
                      isOverdue={true}
                      modalDate={null}
                      onUpdate={handleUpdateClick}
                      hearingLoading={hearingLoading}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── overdue modal ── */}
      {overdueModalOpen && (
        <div className="modal-overlay" onClick={() => setOverdueModalOpen(false)}>
          <div className="modal-card cl-date-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Pending Hearing Updates
                <span className="cl-list-count cl-count-overdue">{overdueCases.length}</span>
              </h3>
              <button className="close-btn" onClick={() => setOverdueModalOpen(false)}>×</button>
            </div>
            <div className="cl-table-wrapper">
              <HearingTable
                rows={overdueCases}
                isPast={true}
                isOverdue={true}
                modalDate={null}
                onUpdate={handleUpdateClick}
                hearingLoading={hearingLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* hearing update modal */}
      {hearingModalOpen && updatingHearing && (
        <HearingFormModal
          editingHearing={updatingHearing}
          authHeaders={authHeaders}
          onClose={closeHearingModal}
          onSuccess={() => { fetchCases(); setOverdueModalOpen(false); setModalDate(null); }}
        />
      )}
    </div>
  );
};

export default CauseList;
