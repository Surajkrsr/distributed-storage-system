import React from "react";
import { Server, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

/**
 * NodeCard — displays information about a single storage node.
 *
 * Props:
 *   node : { id: string, name: string, port: number }
 *   status: "healthy" | "failed" | "unknown"
 *
 * Architecture note:
 *   Status is currently derived from metadata replica lists
 *   (a node is considered involved if it appears in at least one replica list).
 *   When GET /nodes/status is implemented in the backend, update the parent
 *   to pass real live-status from api.getNodeStatus().
 */
export default function NodeCard({ node, status = "unknown" }) {
  const isHealthy = status === "healthy";
  const isFailed = status === "failed";

  const StatusIcon = isHealthy
    ? CheckCircle2
    : isFailed
    ? XCircle
    : HelpCircle;

  const statusLabel = isHealthy ? "Healthy" : isFailed ? "Failed" : "Unknown";

  return (
    <div className={`node-card node-${status}`}>
      <div className="node-card-header">
        <div className={`node-server-icon node-icon-${status}`}>
          <Server size={20} strokeWidth={1.8} />
        </div>
        <div className="node-info">
          <p className="node-name">{node.name}</p>
          <p className="node-port">Port {node.port}</p>
        </div>
      </div>
      <div className="node-status-row">
        <StatusIcon
          size={14}
          className={`node-status-icon icon-${status}`}
        />
        <span className={`node-status-label label-${status}`}>{statusLabel}</span>
      </div>
    </div>
  );
}
