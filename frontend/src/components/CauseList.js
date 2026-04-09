import React, { useCallback, useEffect, useState } from "react";
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

/* ── shared table used in both sections of the today modal ── */
const HearingTable = ({ rows, isPast, isOverdue = false, modalDate, onUpdate, hearingLoading }) => (
  <table className={`cl-table${isOverdue ? " cl-table-overdue" : ""}`}>
    <thead>
      <tr>
        <th className="cl-col-date">
          {isPast ? "Hearing Date" : "Previous Hearing Date"}
        </th>
        <th className="cl-col-party">Petitioner</th>
        <th className="cl-col-party">Defendant</th>
        <th className="cl-col-judge">Judge</th>
        <th className="cl-col-verdict">Verdict</th>
        {isPast && <th className="cl-col-date">Next Date</th>}
        <th className="cl-col-action">Action</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((item) => {
        const prevDate =
          item.previousHearingDate || item.latestHearingId?.hearingDate || null;
        const verdict = item.latestHearingId?.hearingVerdict || "—";
        // Overdue rows always show Update (they need to be recorded regardless).
        // Non-overdue past rows show Update only when no next date is set yet.
        const showUpdate = isOverdue ? true : (isPast ? !item.nextHearingDate : true);

        return (
          <tr key={item._id} className={isOverdue ? "cl-row-overdue" : ""}>
            <td className="cl-col-date">
              <span className="cl-truncate">
                {isOverdue
                  ? formatDisplay(item.nextHearingDate)   // show the missed date
                  : isPast
                    ? formatDisplay(modalDate + "T00:00:00Z")
                    : formatDisplay(prevDate)}
              </span>
            </td>
            <td className="cl-col-party">
              <span className="cl-truncate" title={item.petitioner}>
                {item.petitioner || "—"}
              </span>
            </td>
            <td className="cl-col-party">
              <span className="cl-truncate" title={item.defendant}>
                {item.defendant || "—"}
              </span>
            </td>
            <td className="cl-col-judge">
              <span className="cl-truncate" title={item.judgeName}>
                {item.judgeName || "—"}
              </span>
            </td>
            <td className="cl-col-verdict">
              <span className="cl-verdict-text">{verdict}</span>
            </td>
            {isPast && (
              <td className="cl-col-date">
                <span className="cl-truncate">
                  {item.nextHearingDate ? formatDisplay(item.nextHearingDate) : "—"}
                </span>
              </td>
            )}
            <td className="cl-col-action">
              {showUpdate && (
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

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/* ── main component ──────────────────────────────────── */
const CauseList = () => {
  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Use local date (not UTC) so IST users see the correct "today"
  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // Modal state
  const [modalDate, setModalDate] = useState(null);
  const [hearingLoading, setHearingLoading] = useState(false);
  const [updatingHearing, setUpdatingHearing] = useState(null);
  const [hearingModalOpen, setHearingModalOpen] = useState(false);

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/cases", authHeaders);
      setCases(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  /* ── date maps ───────────────────────────────────────
     Past dates  → keyed by previousHearingDate (fallback: latestHearingId.hearingDate)
     Today + future → keyed by nextHearingDate
  ────────────────────────────────────────────────────── */
  const pastCountByDate   = {};
  const futureCountByDate = {};

  cases.forEach((c) => {
    const prevDate = toLocalDateStr(
      c.previousHearingDate || c.latestHearingId?.hearingDate
    );
    const nextDate = toLocalDateStr(c.nextHearingDate);

    if (prevDate && prevDate < today) {
      pastCountByDate[prevDate] = (pastCountByDate[prevDate] || 0) + 1;
    }
    if (nextDate && nextDate >= today) {
      futureCountByDate[nextDate] = (futureCountByDate[nextDate] || 0) + 1;
    }
  });

  // Total overdue cases (nextHearingDate is set and in the past)
  const overdueTotal = cases.filter((c) => {
    const nd = toLocalDateStr(c.nextHearingDate);
    return nd && nd < today;
  }).length;

  /* Count for a given calendar cell */
  const countForDate = (ds) => {
    if (!ds) return 0;
    if (ds === today) {
      // Today's cell = cases scheduled today + all overdue cases
      return (futureCountByDate[ds] || 0) + overdueTotal;
    }
    return ds < today
      ? (pastCountByDate[ds]   || 0)
      : (futureCountByDate[ds] || 0);
  };

  /* Cases shown in the modal when a date is clicked */
  const casesForDate = (ds) => {
    if (!ds) return [];
    if (ds < today) {
      // past — match on previousHearingDate or latestHearingId.hearingDate
      return cases.filter((c) => {
        const prevDate = toLocalDateStr(
          c.previousHearingDate || c.latestHearingId?.hearingDate
        );
        return prevDate === ds;
      });
    }
    // today or future — match on nextHearingDate
    return cases.filter((c) => toLocalDateStr(c.nextHearingDate) === ds);
  };

  const modalCases = casesForDate(modalDate);
  const isPastModal = modalDate && modalDate < today;
  const isTodayModal = modalDate === today;

  // Overdue: nextHearingDate is set, is strictly before today, meaning
  // the hearing passed but the user never recorded the verdict / next date.
  const overdueCases = isTodayModal
    ? cases.filter((c) => {
        const nd = toLocalDateStr(c.nextHearingDate);
        return nd && nd < today;
      }).sort((a, b) => new Date(a.nextHearingDate) - new Date(b.nextHearingDate))
    : [];

  /* ── calendar grid ───────────────────────────────────── */
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
    day
      ? `${calYear}-${String(calMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
      : null;

  /* ── update hearing ──────────────────────────────────── */
  const handleUpdateClick = async (caseItem) => {
    try {
      setHearingLoading(true);
      const res = await api.get(`/hearings?caseId=${caseItem._id}`, authHeaders);
      const hearings = res.data.data || [];

      // 1. Upcoming hearing that matches the case's nextHearingDate
      let target = hearings.find(
        (h) =>
          h.hearingStatus === "upcoming" &&
          toLocalDateStr(h.hearingDate) === toLocalDateStr(caseItem.nextHearingDate)
      );

      // 2. Any upcoming hearing for this case
      if (!target) target = hearings.find((h) => h.hearingStatus === "upcoming");

      // 3. Done hearing on the clicked date (covers past-date modal with no next date)
      if (!target && modalDate) {
        target = hearings.find((h) => toLocalDateStr(h.hearingDate) === modalDate);
      }

      // 4. Most recent hearing as last resort
      if (!target && hearings.length > 0) {
        target = [...hearings].sort(
          (a, b) => new Date(b.hearingDate) - new Date(a.hearingDate)
        )[0];
      }

      if (!target) {
        alert("No hearing record found for this case.");
        return;
      }

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
          <p>
            Past dates show hearings by last hearing date · Today &amp; future show hearings by next hearing date.
          </p>
        </div>
        <div className="cl-cal-nav">
          <button className="cl-nav-btn" onClick={prevMonth}>‹</button>
          <span className="cl-month-label">{MONTHS[calMonth]} {calYear}</span>
          <button className="cl-nav-btn" onClick={nextMonth}>›</button>
        </div>
      </div>

      {/* full-page calendar */}
      <div className="cl-calendar-card">
        <div className="cl-cal-grid">
          {DAYS.map((d) => (
            <div key={d} className="cl-day-name">{d}</div>
          ))}

          {cells.map((day, idx) => {
            const ds    = cellDateStr(day);
            const count = countForDate(ds);
            const isToday = ds === today;
            const isPast  = ds && ds < today;

            return (
              <div
                key={idx}
                className={[
                  "cl-day-cell",
                  !day      ? "cl-day-empty"    : "",
                  isToday   ? "cl-day-today"     : "",
                  isPast    ? "cl-day-past"      : "",
                  count > 0 ? "cl-day-has-cases" : "",
                ].join(" ").trim()}
                onClick={() => day && setModalDate(ds)}
              >
                {day && (
                  <>
                    <span className="cl-day-num">{day}</span>
                    {count > 0 && (
                      <span className={`cl-case-badge ${isPast ? "cl-badge-past" : ""}`}>
                        {count} case{count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── date modal ──────────────────────────────────── */}
      {modalDate && (
        <div className="modal-overlay" onClick={() => setModalDate(null)}>
          <div
            className="modal-card cl-date-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                {isTodayModal
                  ? "Today's Hearings"
                  : `${isPastModal ? "Hearings held on" : "Hearings on"} ${formatDisplay(modalDate + "T00:00:00Z")}`}
                <span className="cl-list-count">
                  {isTodayModal ? modalCases.length + overdueCases.length : modalCases.length}
                </span>
              </h3>
              <button className="close-btn" onClick={() => setModalDate(null)}>×</button>
            </div>

            {loading ? (
              <p className="cl-empty">Loading…</p>
            ) : (
              <div className="cl-table-wrapper">

                {/* ── today: hearings scheduled for today ── */}
                {isTodayModal && (
                  <>
                    <div className="cl-section-label">
                      Today's Schedule
                      <span className="cl-list-count">{modalCases.length}</span>
                    </div>
                    {modalCases.length === 0 ? (
                      <p className="cl-empty">No hearings scheduled for today.</p>
                    ) : (
                      <HearingTable
                        rows={modalCases}
                        isPast={false}
                        modalDate={modalDate}
                        onUpdate={handleUpdateClick}
                        hearingLoading={hearingLoading}
                      />
                    )}

                    {/* ── pending updates section ── */}
                    {overdueCases.length > 0 && (
                      <>
                        <div className="cl-section-label cl-section-overdue">
                          ⚠ Pending Updates — Hearings not yet recorded
                          <span className="cl-list-count cl-count-overdue">{overdueCases.length}</span>
                        </div>
                        <HearingTable
                          rows={overdueCases}
                          isPast={true}
                          isOverdue={true}
                          modalDate={modalDate}
                          onUpdate={handleUpdateClick}
                          hearingLoading={hearingLoading}
                        />
                      </>
                    )}
                  </>
                )}

                {/* ── non-today modal ── */}
                {!isTodayModal && (
                  modalCases.length === 0 ? (
                    <p className="cl-empty">No hearings found for this date.</p>
                  ) : (
                    <HearingTable
                      rows={modalCases}
                      isPast={isPastModal}
                      modalDate={modalDate}
                      onUpdate={handleUpdateClick}
                      hearingLoading={hearingLoading}
                    />
                  )
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* hearing update modal */}
      {hearingModalOpen && updatingHearing && (
        <HearingFormModal
          editingHearing={updatingHearing}
          authHeaders={authHeaders}
          onClose={closeHearingModal}
          onSuccess={() => { fetchCases(); setModalDate(null); }}
        />
      )}
    </div>
  );
};

export default CauseList;
