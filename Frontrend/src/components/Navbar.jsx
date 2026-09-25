import React from "react";
import { Database, RefreshCw, Wifi, WifiOff } from "lucide-react";
import StatusBadge from "./StatusBadge.jsx";

/**
 * Navbar — top navigation bar.
 *
 * Props:
 *   managerOnline : boolean | null (null = checking)
 *   onRefresh     : () => void
 *   refreshing    : boolean
 */
export default function Navbar({ managerOnline, onRefresh, refreshing }) {
  const statusLabel =
    managerOnline === null ? "Checking..." : managerOnline ? "Manager Online" : "Manager Offline";
  const statusType =
    managerOnline === null ? "unknown" : managerOnline ? "online" : "offline";

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">
          <Database size={22} strokeWidth={2} />
        </div>
        <div className="navbar-title-group">
          <h1 className="navbar-title">Distributed Storage</h1>
          <p className="navbar-subtitle">Fault-Tolerant Object Storage System</p>
        </div>
      </div>

      <div className="navbar-actions">
        <div className="manager-status">
          {managerOnline ? (
            <Wifi size={14} className="status-icon-online" />
          ) : (
            <WifiOff size={14} className="status-icon-offline" />
          )}
          <StatusBadge status={statusType} label={statusLabel} dot={managerOnline === true} />
        </div>

        <button
          className={`btn btn-secondary ${refreshing ? "btn-loading" : ""}`}
          onClick={onRefresh}
          disabled={refreshing}
          id="btn-refresh"
          title="Refresh dashboard"
        >
          <RefreshCw size={15} className={refreshing ? "spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </header>
  );
}
