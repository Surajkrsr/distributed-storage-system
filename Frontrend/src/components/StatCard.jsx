import React from "react";

/**
 * StatCard — summary statistic tile.
 *
 * Props:
 *   icon    : ReactNode
 *   label   : string
 *   value   : string | number | null
 *   loading : boolean
 *   accent  : "blue" | "green" | "amber" | "violet"
 *   note    : optional footnote string
 */
export default function StatCard({ icon, label, value, loading = false, accent = "blue", note }) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <div className="stat-card-header">
        <span className={`stat-icon accent-icon-${accent}`}>{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">
        {loading ? (
          <span className="stat-skeleton" />
        ) : value === null || value === undefined ? (
          <span className="stat-unknown">—</span>
        ) : (
          value
        )}
      </div>
      {note && <p className="stat-note">{note}</p>}
    </div>
  );
}
