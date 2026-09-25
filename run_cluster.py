"""
Distributed Object Storage System Orchestrator
Launches:
  1. Storage Node 1 -> http://127.0.0.1:8001
  2. Storage Node 2 -> http://127.0.0.1:8002
  3. Storage Node 3 -> http://127.0.0.1:8003
  4. Storage Node 4 -> http://127.0.0.1:8004
  5. Replication Manager -> http://127.0.0.1:9000
  6. Frontend Web UI -> http://localhost:5173
"""

import os
import sys
import time
import subprocess
import shutil
import signal

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage_node")
MANAGER_DIR = os.path.join(BASE_DIR, "manager")
FRONTEND_DIR = os.path.join(BASE_DIR, "Frontrend")

def find_node():
    if shutil.which("node"):
        return "node"
    codex_node = r"C:\Users\WELCOME\AppData\Local\OpenAI\Codex\runtimes\cua_node\2c6075088d3180ec\bin\node.exe"
    if os.path.exists(codex_node):
        return codex_node
    return "node"

def find_python():
    return sys.executable

def main():
    python_exe = find_python()
    node_exe = find_node()

    print("=" * 60)
    print("  [*] STARTING DISTRIBUTED OBJECT STORAGE CLUSTER")
    print("=" * 60)
    print(f"  Python executable : {python_exe}")
    print(f"  Node executable   : {node_exe}")
    print("=" * 60)

    procs = []

    # 1. Start Storage Nodes (8001 - 8004)
    nodes = [
        ("node1", 8001),
        ("node2", 8002),
        ("node3", 8003),
        ("node4", 8004),
    ]

    for node_id, port in nodes:
        env = os.environ.copy()
        env["NODE_ID"] = node_id
        env["PORT"] = str(port)
        cmd = [python_exe, "-m", "uvicorn", "node:app", "--port", str(port), "--host", "127.0.0.1", "--log-level", "warning"]
        p = subprocess.Popen(cmd, cwd=STORAGE_DIR, env=env)
        procs.append((f"Storage {node_id} (port {port})", p))
        print(f"  [+] Started Storage Node {node_id} on http://127.0.0.1:{port}")

    # 2. Start Manager (9000)
    mgr_cmd = [python_exe, "-m", "uvicorn", "main:app", "--port", "9000", "--host", "127.0.0.1", "--log-level", "info"]
    p_mgr = subprocess.Popen(mgr_cmd, cwd=MANAGER_DIR)
    procs.append(("Manager (port 9000)", p_mgr))
    print("  [+] Started Replication Manager on http://127.0.0.1:9000")

    # 3. Start Frontend (5173)
    vite_bin = os.path.join(FRONTEND_DIR, "node_modules", "vite", "bin", "vite.js")
    if os.path.exists(vite_bin):
        frontend_cmd = [node_exe, vite_bin, "--host", "localhost", "--port", "5173"]
    else:
        frontend_cmd = ["npm", "run", "dev"]

    p_front = subprocess.Popen(frontend_cmd, cwd=FRONTEND_DIR)
    procs.append(("Frontend (port 5173)", p_front))
    print("  [+] Started Frontend Web UI on http://localhost:5173")

    print("=" * 60)
    print("  DISTRIBUTED STORAGE WEB DASHBOARD:")
    print("      --> http://localhost:5173")
    print("=" * 60)
    print("  Press Ctrl+C at any time to stop all services.")
    print("=" * 60)

    try:
        while True:
            time.sleep(1)
            for name, p in procs:
                ret = p.poll()
                if ret is not None:
                    print(f"  [!] Process '{name}' exited with code {ret}")
    except KeyboardInterrupt:
        print("\n  Stopping all cluster processes...")
        for name, p in procs:
            try:
                p.terminate()
                p.kill()
            except Exception:
                pass
        print("  All services stopped.")

if __name__ == "__main__":
    main()
