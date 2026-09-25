import React, { useState } from "react";
import { Wrench, CheckCircle2, XCircle, CheckCheck, X } from "lucide-react";
import { repairReplicas } from "../services/api.js";
import { NODES_CONFIG } from "../services/api.js";

/**
 * RepairCard — triggers replica repair and shows before/after replica status.
 *
 * Props:
 *   metadata      : { [filename]: { replicas: string[], replication_factor: number } }
 *   onRepairDone  : (updatedMetadata) => void
 */
export default function RepairCard({ metadata, onRepairDone }) {
  const [repairing, setRepairing] = useState(false);
  const [result, setResult] = useState(null); // { type: "success"|"error", data?, message? }

  async function handleRepair() {
    setRepairing(true);
    setResult(null);
    try {
      const data = await repairReplicas();
      setResult({ type: "success", data });
      onRepairDone?.(data.metadata);
    } catch (err) {
      setResult({
        type: "error",
        message: err.message || "Repair failed. Check that the manager is running.",
      });
    } finally {
      setRepairing(false);
    }
  }

  // Collect all replica nodes currently in metadata
  function getAllReplicaNodes() {
    if (!metadata) return {};
    const nodeSet = {};
    NODES_CONFIG.forEach((n) => { nodeSet[n.id] = false; });
    Object.values(metadata).forEach(({ replicas }) => {
      replicas.forEach((r) => { nodeSet[r] = true; });
    });
    return nodeSet;
  }

  // After repair, show updated state from returned metadata
  function getRepairedNodes(repairMeta) {
    if (!repairMeta) return {};
    const nodeSet = {};
    NODES_CONFIG.forEach((n) => { nodeSet[n.id] = false; });
    Object.values(repairMeta).forEach(({ replicas }) => {
      replicas.forEach((r) => { nodeSet[r] = true; });
    });
    return nodeSet;
  }

  const beforeNodes = getAllReplicaNodes();
  const afterNodes =
    result?.type === "success" ? getRepairedNodes(result.data?.metadata) : null;

  function nodeName(id) {
    return NODES_CONFIG.find((n) => n.id === id)?.name ?? id;
  }

  return (
    <div className="card repair-card">
      <div className="card-header">
        <Wrench size={18} className="card-header-icon" />
        <h2 className="card-title">Replica Repair</h2>
      </div>

      <p className="repair-description">
        Restore missing replicas when a storage node fails. The manager will copy data
        from a healthy node to any available spare node.
      </p>

      {/* Replica Node Status Grid */}
      {metadata && Object.keys(metadata).length > 0 && (
        <div className="repair-node-grid">
          {NODES_CONFIG.map((n) => {
            const before = beforeNodes[n.id];
            const after = afterNodes ? afterNodes[n.id] : null;

            // Determine display state
            const hasAfter = afterNodes !== null;
            const active = hasAfter ? after : before;

            return (
              <div key={n.id} className={`repair-node-item ${active ? "rni-active" : "rni-inactive"}`}>
                <span className="rni-name">{n.name}</span>
                {active ? (
                  <CheckCheck size={14} className="rni-icon-ok" />
                ) : (
                  <X size={14} className="rni-icon-fail" />
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        className={`btn btn-repair btn-full ${repairing ? "btn-loading" : ""}`}
        onClick={handleRepair}
        disabled={repairing}
        id="btn-repair"
      >
        <Wrench size={15} />
        {repairing ? "Repairing Replicas..." : "Repair Replicas"}
      </button>

      {result?.type === "success" && (
        <div className="repair-result repair-success">
          <CheckCircle2 size={15} className="result-icon" />
          <p>Repair completed successfully. Metadata updated.</p>
        </div>
      )}

      {result?.type === "error" && (
        <div className="repair-result repair-error">
          <XCircle size={15} className="result-icon" />
          <p>{result.message}</p>
        </div>
      )}
    </div>
  );
}
