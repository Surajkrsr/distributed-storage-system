/**
 * API Service — communicates exclusively with the Manager on port 9000.
 * All business logic (replication, repair, node routing) lives in the backend.
 *
 * Architecture:
 *   React UI  →  Manager :9000  →  Nodes :8001-8004
 *
 * Future endpoints are stubbed here so they can be enabled with a one-line change.
 */

const API_BASE_URL = "http://127.0.0.1:9000";

// ─── Configurable constants ───────────────────────────────────────────────────
export const NODES_CONFIG = [
  { id: "node1", name: "Node 1", port: 8001 },
  { id: "node2", name: "Node 2", port: 8002 },
  { id: "node3", name: "Node 3", port: 8003 },
  { id: "node4", name: "Node 4", port: 8004 },
];

export const REPLICATION_FACTOR_DEFAULT = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Manager may be offline.");
    }
    throw err;
  }
}

// ─── Active endpoints ─────────────────────────────────────────────────────────

/**
 * GET /health
 * Returns { service: "replication-manager", status: "running" }
 */
export async function getManagerHealth() {
  return apiFetch("/health");
}

/**
 * GET /metadata
 * Returns a map of filename → { size, replication_factor, replicas[] }
 */
export async function getMetadata() {
  return apiFetch("/metadata");
}

/**
 * POST /upload  (multipart/form-data, field: "file")
 * Returns { filename, replication_factor, successful_nodes[], failed_nodes[] }
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for uploads

  try {
    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      throw new Error(`Upload failed (HTTP ${res.status}): ${text}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Upload timed out.");
    }
    throw err;
  }
}

/**
 * POST /repair
 * Returns { message, metadata }
 */
export async function repairReplicas() {
  return apiFetch("/repair", { method: "POST" });
}

// ─── Live endpoints ──────────────────────────────────────────────────────────

/**
 * GET /nodes/status
 * Returns live health status for all nodes { node1: "healthy" | "failed", ... }
 */
export async function getNodeStatus() {
  try {
    return await apiFetch("/nodes/status");
  } catch {
    return null;
  }
}

/**
 * GET /objects/{filename} (manager-level download)
 * Downloads the file by retrieving it from an available replica node.
 */
export async function downloadFile(filename) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${API_BASE_URL}/objects/${encodeURIComponent(filename)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      throw new Error(`Download failed (HTTP ${res.status}): ${text}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * DELETE /objects/{filename} (manager-level delete)
 * Deletes the file from all replica nodes and removes it from metadata.
 */
export async function deleteFile(filename) {
  return apiFetch(`/objects/${encodeURIComponent(filename)}`, { method: "DELETE" });
}
