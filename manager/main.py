from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import requests
import json
import os
import io

app = FastAPI(title="Replication Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NODES = {
    "node1": "http://127.0.0.1:8001",
    "node2": "http://127.0.0.1:8002",
    "node3": "http://127.0.0.1:8003",
    "node4": "http://127.0.0.1:8004"
}

METADATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "metadata.json")


def load_metadata():
    if not os.path.exists(METADATA_FILE):
        return {}
    try:
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def save_metadata(metadata):
    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=4)


def repair_replicas():
    metadata = load_metadata()

    for filename, info in metadata.items():
        healthy_replicas = []

        # Check existing replicas
        for node_name in info.get("replicas", []):
            node_url = NODES.get(node_name)
            if not node_url:
                continue

            try:
                response = requests.get(f"{node_url}/health", timeout=2)
                if response.status_code == 200:
                    healthy_replicas.append(node_name)
            except Exception:
                pass

        # Update healthy replicas
        info["replicas"] = healthy_replicas
        required = info.get("replication_factor", 3)

        # Need more replicas and have at least 1 healthy source?
        if len(healthy_replicas) < required and len(healthy_replicas) > 0:
            needed = required - len(healthy_replicas)

            # Find available nodes
            available_nodes = []
            for node_name, node_url in NODES.items():
                if node_name in healthy_replicas:
                    continue

                try:
                    response = requests.get(f"{node_url}/health", timeout=2)
                    if response.status_code == 200:
                        available_nodes.append(node_name)
                except Exception:
                    pass

            # Repair from the first healthy replica
            for node_name in available_nodes[:needed]:
                source_node = healthy_replicas[0]
                source_url = NODES[source_node]
                destination_url = NODES[node_name]

                try:
                    file_response = requests.get(
                        f"{source_url}/objects/{filename}",
                        timeout=10
                    )

                    if file_response.status_code == 200:
                        upload_response = requests.post(
                            f"{destination_url}/objects/{filename}",
                            files={
                                "file": (
                                    filename,
                                    file_response.content
                                )
                            },
                            timeout=10
                        )

                        if upload_response.status_code == 200:
                            healthy_replicas.append(node_name)
                except Exception:
                    pass

            info["replicas"] = healthy_replicas

    save_metadata(metadata)
    return metadata


@app.get("/health")
def health():
    return {
        "service": "replication-manager",
        "status": "running"
    }


@app.get("/nodes/status")
def get_nodes_status():
    status = {}
    for node_name, node_url in NODES.items():
        try:
            res = requests.get(f"{node_url}/health", timeout=2)
            if res.status_code == 200:
                status[node_name] = "healthy"
            else:
                status[node_name] = "failed"
        except Exception:
            status[node_name] = "failed"
    return status


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_data = await file.read()

    successful_nodes = []
    failed_nodes = []
    target_factor = 3

    for node_name, node_url in NODES.items():
        if len(successful_nodes) >= target_factor:
            break
        try:
            response = requests.post(
                f"{node_url}/objects/{file.filename}",
                files={
                    "file": (
                        file.filename,
                        file_data,
                        file.content_type or "application/octet-stream"
                    )
                },
                timeout=5
            )

            if response.status_code == 200:
                successful_nodes.append(node_name)
            else:
                failed_nodes.append(node_name)

        except Exception:
            failed_nodes.append(node_name)

    # Save metadata
    metadata = load_metadata()
    metadata[file.filename] = {
        "size": len(file_data),
        "replication_factor": target_factor,
        "replicas": successful_nodes
    }
    save_metadata(metadata)

    return {
        "filename": file.filename,
        "replication_factor": len(successful_nodes),
        "successful_nodes": successful_nodes,
        "failed_nodes": failed_nodes
    }


@app.get("/metadata")
def get_metadata():
    return load_metadata()


@app.post("/repair")
def repair():
    metadata = repair_replicas()
    return {
        "message": "Repair completed",
        "metadata": metadata
    }


@app.get("/objects/{filename}")
def download_file(filename: str):
    metadata = load_metadata()
    if filename not in metadata:
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found in metadata.")

    replicas = metadata[filename].get("replicas", [])
    for node_name in replicas:
        node_url = NODES.get(node_name)
        if not node_url:
            continue
        try:
            res = requests.get(f"{node_url}/objects/{filename}", stream=True, timeout=10)
            if res.status_code == 200:
                return StreamingResponse(
                    io.BytesIO(res.content),
                    media_type="application/octet-stream",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'}
                )
        except Exception:
            continue

    raise HTTPException(status_code=503, detail="No healthy storage node replica currently available.")


@app.delete("/objects/{filename}")
def delete_file(filename: str):
    metadata = load_metadata()
    if filename not in metadata:
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found.")

    deleted_from = []
    for node_name, node_url in NODES.items():
        try:
            res = requests.delete(f"{node_url}/objects/{filename}", timeout=5)
            if res.status_code == 200:
                deleted_from.append(node_name)
        except Exception:
            pass

    del metadata[filename]
    save_metadata(metadata)

    return {
        "message": f"File '{filename}' deleted from cluster.",
        "filename": filename,
        "deleted_from": deleted_from
    }