from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, tickets
import os

app = FastAPI(title="ITSM Fusion I.T.", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tickets.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ITSM Fusion I.T."}
