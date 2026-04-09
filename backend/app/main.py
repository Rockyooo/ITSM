from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, tickets, messages, attachments, users, public, permissions, tenants
import os, pathlib

app = FastAPI(title="ITSM Fusion I.T.", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_path = pathlib.Path("/app/uploads")
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(messages.router)
app.include_router(attachments.router)
app.include_router(users.router)
app.include_router(public.router)
app.include_router(permissions.router)
app.include_router(tenants.router)

@app.on_event("startup")
async def run_migrations():
    from app.database import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain VARCHAR(100) UNIQUE"))
            conn.commit()
        except: pass
        try:
            conn.execute(text("UPDATE tenants SET domain = 'fusion-it.co' WHERE id = 'tenant-001' AND domain IS NULL"))
            conn.commit()
        except: pass
        try:
            conn.execute(text("""
                INSERT INTO tenants (id, name, slug, domain, is_active, created_at)
                VALUES ('tenant-prueba', 'Empresa Prueba', 'empresa-prueba', 'fusion-prueba.co', true, NOW())
                ON CONFLICT (id) DO NOTHING
            """))
            conn.commit()
        except: pass
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS tenant_user_permissions (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR NOT NULL REFERENCES users(id),
                    tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
                    permissions JSON DEFAULT '[]',
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id, tenant_id)
                )
            """))
            conn.commit()
        except: pass
        try:
            conn.execute(text("ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS is_alert BOOLEAN DEFAULT FALSE"))
            conn.commit()
        except: pass
        try:
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS nit VARCHAR(50)"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR(50)"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200)"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address VARCHAR(300)"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)"))
            conn.commit()
        except: pass
        try:
            conn.execute(text("UPDATE users SET role = 'superadmin' WHERE email = 'admin@fusion-it.co' AND role = 'admin'"))
            conn.commit()
        except: pass

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ITSM Fusion I.T.", "version": "1.0.0"}



