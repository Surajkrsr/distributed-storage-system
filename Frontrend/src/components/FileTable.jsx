import React, { useState } from "react";
import { FileText, AlertCircle, Download, Trash2, Loader2 } from "lucide-react";
import { downloadFile, deleteFile } from "../services/api.js";

/**
 * FileTable — displays stored objects from GET /metadata.
 *
 * Props:
 *   metadata       : { [filename]: { size, replication_factor, replicas[] } }
 *   loading        : boolean
 *   onActionDone   : () => void
 */
export default function FileTable({ metadata, loading, onActionDone }) {
  const [actionInProgress, setActionInProgress] = useState({}); // { [filename]: 'downloading' | 'deleting' }
  const [actionError, setActionError] = useState(null);

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  function nodeLabel(id) {
    return id.replace("node", "Node ");
  }

  function replicaStatus(replicas, factor) {
    const have = replicas.length;
    if (have >= factor) return { label: `${have} / ${factor}`, cls: "rep-healthy", text: "Healthy" };
    if (have > 0)       return { label: `${have} / ${factor}`, cls: "rep-warning", text: "Needs Repair" };
    return               { label: `0 / ${factor}`,             cls: "rep-failed",  text: "No Replicas" };
  }

  async function handleDownload(filename) {
    setActionInProgress((prev) => ({ ...prev, [filename]: "downloading" }));
    setActionError(null);
    try {
      await downloadFile(filename);
    } catch (err) {
      setActionError(`Download failed for ${filename}: ${err.message}`);
    } finally {
      setActionInProgress((prev) => ({ ...prev, [filename]: null }));
    }
  }

  async function handleDelete(filename) {
    if (!window.confirm(`Are you sure you want to delete '${filename}' from all nodes in the cluster?`)) {
      return;
    }
    setActionInProgress((prev) => ({ ...prev, [filename]: "deleting" }));
    setActionError(null);
    try {
      await deleteFile(filename);
      onActionDone?.();
    } catch (err) {
      setActionError(`Delete failed for ${filename}: ${err.message}`);
    } finally {
      setActionInProgress((prev) => ({ ...prev, [filename]: null }));
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <FileText size={18} className="card-header-icon" />
          <h2 className="card-title">Stored Objects</h2>
        </div>
        <div className="table-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="table-skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  const entries = metadata ? Object.entries(metadata) : [];

  return (
    <div className="card">
      <div className="card-header">
        <FileText size={18} className="card-header-icon" />
        <h2 className="card-title">Stored Objects</h2>
        {entries.length > 0 && (
          <span className="card-badge">{entries.length}</span>
        )}
      </div>

      {actionError && (
        <div className="alert-banner alert-error" style={{ marginBottom: "14px" }}>
          ⚠ {actionError}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="table-empty">
          <AlertCircle size={32} className="table-empty-icon" />
          <p className="table-empty-title">No objects stored yet</p>
          <p className="table-empty-sub">Upload a file above to see it here.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="file-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Size</th>
                <th>Replication Factor</th>
                <th>Replica Nodes</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([filename, info]) => {
                const { replicas = [], replication_factor = 3, size = 0 } = info;
                const rep = replicaStatus(replicas, replication_factor);
                const currentAction = actionInProgress[filename];

                return (
                  <tr key={filename} className="file-row">
                    <td className="td-filename">
                      <FileText size={14} className="td-file-icon" />
                      <span className="filename-text">{filename}</span>
                    </td>
                    <td className="td-size">{formatBytes(size)}</td>
                    <td className="td-factor">{replication_factor}×</td>
                    <td className="td-replicas">
                      <div className="replica-badges">
                        {replicas.length > 0 ? (
                          replicas.map((n) => (
                            <span key={n} className="node-badge">{nodeLabel(n)}</span>
                          ))
                        ) : (
                          <span className="no-replicas">None</span>
                        )}
                      </div>
                    </td>
                    <td className="td-status">
                      <div className={`rep-status ${rep.cls}`}>
                        <span className="rep-fraction">{rep.label}</span>
                        <span className="rep-text">{rep.text}</span>
                      </div>
                    </td>
                    <td className="td-actions" style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDownload(filename)}
                          disabled={!!currentAction}
                          title="Download file from cluster"
                        >
                          {currentAction === "downloading" ? (
                            <Loader2 size={13} className="spin" />
                          ) : (
                            <Download size={13} />
                          )}
                          Download
                        </button>
                        <button
                          className="btn btn-secondary btn-sm btn-danger-hover"
                          onClick={() => handleDelete(filename)}
                          disabled={!!currentAction}
                          title="Delete file from cluster"
                        >
                          {currentAction === "deleting" ? (
                            <Loader2 size={13} className="spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
