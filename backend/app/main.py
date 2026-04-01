from fastapi import FastAPI
import os

app = FastAPI(title="ITSM Fusion I.T.", version="1.0.0")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ITSM Fusion I.T."}