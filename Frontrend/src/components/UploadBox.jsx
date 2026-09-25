import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { uploadFile } from "../services/api.js";

/**
 * UploadBox — file picker + upload UI.
 *
 * Props:
 *   onUploadSuccess : (result) => void   — called after a successful upload
 */
export default function UploadBox({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);   // { type: "success"|"error", data }
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  }

  async function handleUpload() {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setResult(null);

    try {
      const data = await uploadFile(selectedFile);
      setResult({ type: "success", data });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploadSuccess?.(data);
    } catch (err) {
      setResult({
        type: "error",
        message: err.message || "Upload failed. Check that the manager is running.",
      });
    } finally {
      setUploading(false);
    }
  }

  function formatNodeList(nodes) {
    if (!nodes || nodes.length === 0) return "None";
    return nodes.map((n) => n.replace("node", "Node ")).join(", ");
  }

  return (
    <div className="card upload-card">
      <div className="card-header">
        <Upload size={18} className="card-header-icon" />
        <h2 className="card-title">Upload Object</h2>
      </div>

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragging ? "drop-zone-active" : ""} ${selectedFile ? "drop-zone-selected" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        id="drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="visually-hidden"
          onChange={handleFileChange}
          id="file-input"
        />
        {selectedFile ? (
          <div className="selected-file-info">
            <FileText size={28} className="file-icon-selected" />
            <div>
              <p className="selected-file-name">{selectedFile.name}</p>
              <p className="selected-file-size">{formatBytes(selectedFile.size)}</p>
            </div>
          </div>
        ) : (
          <div className="drop-zone-placeholder">
            <Upload size={28} className="upload-icon-placeholder" />
            <p className="drop-zone-text">
              <span className="drop-zone-link">Choose a file</span> or drag and drop
            </p>
            <p className="drop-zone-hint">Any file type supported</p>
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        className={`btn btn-primary btn-full ${uploading ? "btn-loading" : ""}`}
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        id="btn-upload"
      >
        <Upload size={15} />
        {uploading ? "Uploading..." : "Upload & Replicate"}
      </button>

      {/* Result messages */}
      {result?.type === "success" && (
        <div className="upload-result upload-success">
          <CheckCircle2 size={16} className="result-icon" />
          <div>
            <p className="result-title">
              File <strong>{result.data.filename}</strong> uploaded and replicated to{" "}
              {result.data.successful_nodes?.length ?? 0} node(s).
            </p>
            <p className="result-detail">
              ✓ Replicas: {formatNodeList(result.data.successful_nodes)}
            </p>
            {result.data.failed_nodes?.length > 0 && (
              <p className="result-warning">
                ✗ Failed nodes: {formatNodeList(result.data.failed_nodes)}
              </p>
            )}
          </div>
        </div>
      )}

      {result?.type === "error" && (
        <div className="upload-result upload-error">
          <XCircle size={16} className="result-icon" />
          <p>{result.message}</p>
        </div>
      )}

      {/* Helpful hint */}
      <p className="upload-hint">
        <AlertCircle size={12} />
        Files are replicated across available nodes by the manager.
      </p>
    </div>
  );
}
