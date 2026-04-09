from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import declarative_base
import uuid, datetime

Base = declarative_base()

def now(): return datetime.datetime.utcnow()
def uid(): return str(uuid.uuid4())

class Tenant(Base):
    __tablename__ = "tenants"
    id            = Column(String, primary_key=True, default=uid)
    name          = Column(String(100), nullable=False)
    slug          = Column(String(50), unique=True, nullable=False)
    domain        = Column(String(100), unique=True)
    nit           = Column(String(50))
    phone         = Column(String(50))
    contact_email = Column(String(200))
    address       = Column(String(300))
    logo_url      = Column(String(500))
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=now)

class User(Base):
    __tablename__ = "users"
    id              = Column(String, primary_key=True, default=uid)
    tenant_id       = Column(String, ForeignKey("tenants.id"), nullable=False)
    email           = Column(String(200), unique=True, nullable=False)
    full_name       = Column(String(200))
    hashed_password = Column(String(200))
    role            = Column(String(20), default="client")
    is_active       = Column(Boolean, default=True)
    totp_secret     = Column(String(100))
    created_at      = Column(DateTime, default=now)

class TenantUserPermission(Base):
    __tablename__ = "tenant_user_permissions"
    id          = Column(String, primary_key=True, default=uid)
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    tenant_id   = Column(String, ForeignKey("tenants.id"), nullable=False)
    permissions = Column(JSON, default=list)
    created_at  = Column(DateTime, default=now)

class Ticket(Base):
    __tablename__ = "tickets"
    id            = Column(String, primary_key=True, default=uid)
    ticket_number = Column(String(20), unique=True)
    tenant_id     = Column(String, ForeignKey("tenants.id"), nullable=False)
    requester_id  = Column(String, ForeignKey("users.id"))
    assigned_to   = Column(String, ForeignKey("users.id"))
    title         = Column(String(300), nullable=False)
    description   = Column(Text)
    status        = Column(String(30), default="open")
    priority      = Column(String(20), default="medium")
    ticket_type   = Column(String(30), default="incident")
    category      = Column(String(100))
    due_at        = Column(DateTime)
    resolved_at   = Column(DateTime)
    created_at    = Column(DateTime, default=now)
    updated_at    = Column(DateTime, default=now, onupdate=now)

class TicketMessage(Base):
    __tablename__ = "ticket_messages"
    id          = Column(String, primary_key=True, default=uid)
    ticket_id   = Column(String, ForeignKey("tickets.id"), nullable=False)
    author_id   = Column(String, ForeignKey("users.id"))
    body        = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    is_alert    = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=now)

class Attachment(Base):
    __tablename__ = "attachments"
    id           = Column(String, primary_key=True, default=uid)
    message_id   = Column(String, ForeignKey("ticket_messages.id"), nullable=False)
    ticket_id    = Column(String, ForeignKey("tickets.id"), nullable=False)
    tenant_id    = Column(String, ForeignKey("tenants.id"), nullable=False)
    filename     = Column(String(300), nullable=False)
    stored_name  = Column(String(300), nullable=False)
    file_url     = Column(String(500), nullable=False)
    content_type = Column(String(100))
    file_size    = Column(Integer)
    created_at   = Column(DateTime, default=now)

class Asset(Base):
    __tablename__ = "assets"
    id            = Column(String, primary_key=True, default=uid)
    tenant_id     = Column(String, ForeignKey("tenants.id"), nullable=False)
    name          = Column(String(200), nullable=False)
    asset_type    = Column(String(50))
    serial_number = Column(String(100))
    assigned_to   = Column(String, ForeignKey("users.id"))
    status        = Column(String(30), default="active")
    created_at    = Column(DateTime, default=now)

