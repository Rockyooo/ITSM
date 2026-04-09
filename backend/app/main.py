from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.routers import auth, tickets, messages, attachments, users, public, permissions, tenants, import_users
from app.database import get_db
import os, pathlib

app = FastAPI(title="ITSM Fusion I.T.", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "https://itsm-nine.vercel.app,http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_path = pathlib.Path("/app/uploads")
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "service": "ITSM Fusion I.T.", "version": "1.0.0", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": str(e)}

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(messages.router)
app.include_router(attachments.router)
app.include_router(users.router)
app.include_router(public.router)
app.include_router(permissions.router)
app.include_router(tenants.router)
app.include_router(import_users.router)

@app.on_event("startup")
async def run_migrations():
    from app.database import engine
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
            conn.execute(text("ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(30) DEFAULT 'comment'"))
            conn.execute(text("UPDATE ticket_messages SET message_type = 'alert' WHERE is_alert = TRUE AND (message_type IS NULL OR message_type = '')"))
            conn.execute(text("UPDATE ticket_messages SET message_type = 'comment' WHERE message_type IS NULL OR message_type = ''"))
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
            conn.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS merged_into_id VARCHAR"))
            conn.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS merged_at TIMESTAMP"))
            conn.commit()
        except: pass
        try:
            conn.execute(text("UPDATE users SET role = 'superadmin' WHERE email = 'admin@fusion-it.co' AND role = 'admin'"))
            conn.commit()
        except: pass