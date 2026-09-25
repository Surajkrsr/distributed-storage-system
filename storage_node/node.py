from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os

app = FastAPI(title="Storage Node")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Node configuration
NODE_ID = os.getenv("NODE_ID", "node1")
PORT = os.getenv("PORT", "8001")

# Each node gets its own storage folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "nodes", NODE_ID)

os.makedirs(STORAGE_DIR, exist_ok=True)


@app.get("/health")
def health():
    return {
        "node": NODE_ID,
        "status": "healthy"
    }


@app.post("/objects/{filename}")
async def upload_file(filename: str, file: UploadFile):

    file_path = os.path.join(STORAGE_DIR, filename)

    with open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)

    return {
        "message": "File stored successfully",
        "node": NODE_ID,
        "filename": filename
    }


@app.get("/objects/{filename}")
def download_file(filename: str):

    file_path = os.path.join(STORAGE_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    return FileResponse(file_path)


@app.delete("/objects/{filename}")
def delete_file(filename: str):

    file_path = os.path.join(STORAGE_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    os.remove(file_path)

    return {
        "message": "File deleted",
        "node": NODE_ID,
        "filename": filename
    }