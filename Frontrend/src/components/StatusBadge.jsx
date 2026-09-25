import React from "react";

/**
 * StatusBadge — a small coloured pill indicating a status.
 *
 * Props:
 *   status  : "healthy" | "failed" | "warning" | "unknown" | "repairing"
 *   label   : optional override text
 *   dot     : boolean — show a pulsing dot (default false)
 *   size    : "sm" | "md" (default "md")
 */
export default function StatusBadge({ status = "unknown", label, dot = false, size = "md" }) {
  const map = {
    healthy:   { cls: "badge-healthy",   text: "Healthy" },
    online:    { cls: "badge-healthy",   text: "Online" },
    failed:    { cls: "badge-failed",    text: "Failed" },
    offline:   { cls: "badge-failed",    text: "Offline" },
    warning:   { cls: "badge-warning",   text: "Degraded" },
    repairing: { cls: "badge-repairing", text: "Repairing" },
    unknown:   { cls: "badge-unknown",   text: "Unknown" },
  };

  const { cls, text } = map[status] ?? map.unknown;
  const displayText = label ?? text;

  return (
    <span className={`status-badge ${cls} badge-${size}`}>
      {dot && <span className={`status-dot ${cls}-dot`} />}
      {displayText}
    </span>
  );
}
