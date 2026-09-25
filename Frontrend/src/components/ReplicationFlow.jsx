import React from "react";
import { ArrowDown, GitBranch, CheckCircle2, XCircle } from "lucide-react";
import { NODES_CONFIG } from "../services/api.js";

/**
 * ReplicationFlow — visual diagram showing FILE → Manager → Nodes.
 *
 * Props:
 *   metadata : { [filename]: { replicas: string[], replication_factor: number } }
 */
export default function ReplicationFlow({ metadata }) {
  // Determine which nodes have at least one replica
  const activeNodes = new Set();
  if (metadata) {
    Object.values(metadata).forEach(({ replicas }) => {
      replicas.forEach((r) => activeNodes.add(r));
    });
  }

  const totalFiles = metadata ? Object.keys(metadata).length : 0;
  const totalReplicas = metadata
    ? Object.values(metadata).reduce((sum, f) => sum + f.replicas.length, 0)
    : 0;

  return (
    <div className="card flow-card">
      <div className="card-header">
        <GitBranch size={18} className="card-header-icon" />
        <h2 className="card-title">Replication Flow</h2>
      </div>

      <div className="flow-diagram">
        {/* FILE source */}
        <div className="flow-source">
          <div className="flow-box flow-box-file">
            <span className="flow-box-icon">📄</span>
            <span className="flow-box-label">Object</span>
          </div>
        </div>

        {/* Arrow down to manager */}
        <div className="flow-arrow-col">
          <ArrowDown size={18} className="flow-arrow" />
          <span className="flow-arrow-label">Upload</span>
        </div>

        {/* Manager */}
        <div className="flow-manager-row">
          <div className="flow-box flow-box-manager">
            <span className="flow-box-icon">⚙</span>
            <span className="flow-box-label">Replication Manager</span>
            <span className="flow-box-sub">:9000</span>
          </div>
        </div>

        {/* Arrows to nodes */}
        <div className="flow-arrows-spread">
          {NODES_CONFIG.map((_, i) => (
            <div key={i} className="flow-spread-arrow">
              <ArrowDown size={14} className="flow-arrow-small" />
            </div>
          ))}
        </div>

        {/* Node boxes */}
        <div className="flow-nodes">
          {NODES_CONFIG.map((node) => {
            const active = activeNodes.has(node.id);
            return (
              <div
                key={node.id}
                className={`flow-node-box ${active ? "flow-node-active" : "flow-node-idle"}`}
              >
                {active ? (
                  <CheckCircle2 size={14} className="flow-node-check" />
                ) : (
                  <XCircle size={14} className="flow-node-x" />
                )}
                <span className="flow-node-name">{node.name}</span>
                <span className="flow-node-port">:{node.port}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary line */}
      <div className="flow-summary">
        <span>{totalFiles} object{totalFiles !== 1 ? "s" : ""}</span>
        <span className="flow-dot">·</span>
        <span>{totalReplicas} total replica{totalReplicas !== 1 ? "s" : ""}</span>
        <span className="flow-dot">·</span>
        <span>{activeNodes.size} node{activeNodes.size !== 1 ? "s" : ""} active</span>
      </div>
    </div>
  );
}
