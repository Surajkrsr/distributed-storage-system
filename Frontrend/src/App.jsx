import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  HardDrive, Server, ShieldCheck, Copy,
} from "lucide-react";

import Navbar from "./components/Navbar.jsx";
import StatCard from "./components/StatCard.jsx";
import NodeCard from "./components/NodeCard.jsx";
import UploadBox from "./components/UploadBox.jsx";
import FileTable from "./components/FileTable.jsx";
import RepairCard from "./components/RepairCard.jsx";
import ReplicationFlow from "./components/ReplicationFlow.jsx";

import {
  getManagerHealth,
  getMetadata,
  getNodeStatus,   // stubbed — returns null until backend exposes /nodes/status
  NODES_CONFIG,
} from "./services/api.js";

import "./App.css";

// ─── Configuration ─────────────────────────────────────────────────────────────
// Change AUTO_REFRESH_INTERVAL to 0 to disable auto-refresh.
const AUTO_REFRESH_INTERVAL = 5000; // ms

// ─── Helpers ──────────────────────────────────────────────────────────────────
function deriveNodeStatuses(metadata) {
  /**
   * IMPORTANT: This function derives "seen in replica list" status, NOT live health.
   * It is a PLACEHOLDER until GET /nodes/status is implemented in the manager.
   *
   * Logic:
   *   - A node that appears in at least one replica list is considered "involved".
   *   - A node that is NOT in any replica list is "unknown" (not necessarily failed).
   *   - We cannot determine if a node is actually running from metadata alone.
   *
   * When getNodeStatus() returns real data, replace the body of this function.
   */
  const statuses = {};
  NODES_CONFIG.forEach((n) => { statuses[n.id] = "unknown"; });

  if (!metadata) return statuses;

  Object.values(metadata).forEach(({ replicas }) => {
    replicas.forEach((r) => {
      if (statuses[r] !== undefined) statuses[r] = "healthy";
    });
  });

  return statuses;
}

function computeStats(metadata) {
  if (!metadata) return { objects: 0, totalReplicas: 0 };
  const entries = Object.values(metadata);
  const totalReplicas = entries.reduce((sum, f) => sum + (f.replicas?.length ?? 0), 0);
  return { objects: entries.length, totalReplicas };
}

// ──────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [managerOnline, setManagerOnline]     = useState(null);   // null = checking
  const [metadata, setMetadata]               = useState(null);
  const [metaLoading, setMetaLoading]         = useState(true);
  const [metaError, setMetaError]             = useState(null);
  const [liveNodeStatus, setLiveNodeStatus]   = useState(null);
  const [refreshing, setRefreshing]           = useState(false);
  const [lastRefreshed, setLastRefreshed]     = useState(null);
  const intervalRef = useRef(null);

  // ─── Fetch all data ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);

    // 1. Manager health
    try {
      await getManagerHealth();
      setManagerOnline(true);
    } catch {
      setManagerOnline(false);
    }

    // 2. Metadata
    try {
      setMetaLoading(true);
      setMetaError(null);
      const data = await getMetadata();
      setMetadata(data);
    } catch (err) {
      setMetaError(err.message || "Failed to load metadata.");
      setMetadata(null);
    } finally {
      setMetaLoading(false);
    }

    // 3. Live Node status
    try {
      const nodeStatus = await getNodeStatus();
      if (nodeStatus) setLiveNodeStatus(nodeStatus);
    } catch {
      // ignore
    }

    setLastRefreshed(new Date());
    if (isManual) setRefreshing(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  // Auto-refresh
  useEffect(() => {
    if (AUTO_REFRESH_INTERVAL <= 0) return;
    intervalRef.current = setInterval(() => fetchAll(false), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  // ─── Derived data ──────────────────────────────────────────────────────────
  const derivedStatuses = deriveNodeStatuses(metadata);
  const nodeStatuses = liveNodeStatus || derivedStatuses;
  const { objects, totalReplicas } = computeStats(metadata);
  const healthyCount = Object.values(nodeStatuses).filter((s) => s === "healthy").length;

  // ─── Callbacks ────────────────────────────────────────────────────────────
  function handleUploadSuccess() {
    fetchAll(false);
  }

  function handleRepairDone(updatedMeta) {
    if (updatedMeta) setMetadata(updatedMeta);
    fetchAll(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <Navbar
        managerOnline={managerOnline}
        onRefresh={() => fetchAll(true)}
        refreshing={refreshing}
      />

      <main className="main-content">
        {/* Manager offline banner */}
        {managerOnline === false && (
          <div className="alert-banner alert-offline">
            ⚠ Manager is offline. Start the FastAPI manager on port 9000 and refresh.
          </div>
        )}

        {/* Metadata error banner */}
        {metaError && !metaLoading && (
          <div className="alert-banner alert-error">
            ⚠ {metaError}
          </div>
        )}

        {/* ── Statistics row ─────────────────────────────────────────────── */}
        <section className="stats-grid">
          <StatCard
            icon={<HardDrive size={20} />}
            label="Stored Objects"
            value={metaLoading ? null : objects}
            loading={metaLoading}
            accent="blue"
          />
          <StatCard
            icon={<Server size={20} />}
            label="Storage Nodes"
            value={NODES_CONFIG.length}
            accent="violet"
            note="Total configured nodes"
          />
          <StatCard
            icon={<ShieldCheck size={20} />}
            label="Active Nodes"
            value={healthyCount > 0 ? healthyCount : "—"}
            loading={false}
            accent="green"
            note={liveNodeStatus ? "Live online storage nodes" : "Nodes seen in replica lists"}
          />
          <StatCard
            icon={<Copy size={20} />}
            label="Total Replicas"
            value={metaLoading ? null : totalReplicas}
            loading={metaLoading}
            accent="amber"
          />
        </section>

        {/* ── Storage Nodes ─────────────────────────────────────────────── */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Storage Nodes</h2>
            <span className="section-note">
              {liveNodeStatus ? "Real-time node health monitoring." : "Status derived from metadata replica lists."}
            </span>
          </div>
          <div className="nodes-grid">
            {NODES_CONFIG.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                status={nodeStatuses[node.id] ?? "unknown"}
              />
            ))}
          </div>
        </section>

        {/* ── Middle row: Upload + Repair + Flow ────────────────────────── */}
        <section className="mid-row">
          <div className="mid-left">
            <UploadBox onUploadSuccess={handleUploadSuccess} />
          </div>
          <div className="mid-right">
            <RepairCard metadata={metadata} onRepairDone={handleRepairDone} />
            <ReplicationFlow metadata={metadata} />
          </div>
        </section>

        {/* ── Stored Objects table ──────────────────────────────────────── */}
        <section className="section">
          <FileTable
            metadata={metadata}
            loading={metaLoading}
            onActionDone={() => fetchAll(false)}
          />
        </section>

        {/* Footer */}
        <footer className="footer">
          <span>Distributed Fault-Tolerant Object Storage — Manager :9000</span>
          {lastRefreshed && (
            <span>Last refreshed: {lastRefreshed.toLocaleTimeString()}</span>
          )}
        </footer>
      </main>
    </div>
  );
}
