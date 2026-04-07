from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, tickets, messages, attachments
import os, pathlib

app = FastAPI(title="ITSM Fusion I.T.", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos locales (solo en modo local/development)
uploads_path = pathlib.Path("/app/uploads")
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(messages.router)
app.include_router(attachments.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ITSM Fusion I.T.", "version": "1.0.0"}
