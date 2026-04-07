from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid, datetime, enum

Base = declarative_base()

def now(): return datetime.datetime.utcnow()
def uid(): return str(uuid.uuid4())

class Tenant(Base):
    __tablename__ = "tenants"
    id            = Column(String, primary_key=True, default=uid)
    name          = Column(String(100), nullable=False)
    slug          = Column(String(50), unique=True, nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=now)

class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True, default=uid)
    tenant_id     = Column(String, ForeignKey("tenants.id"), nullable=False)
    email         = Column(String(200), unique=True, nullable=False)
    full_name     = Column(String(200))
    hashed_password = Column(String(200))
    role          = Column(String(20), default="client")
    is_active     = Column(Boolean, default=True)
    totp_secret   = Column(String(100))
    created_at    = Column(DateTime, default=now)

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
    id            = Column(String, primary_key=True, default=uid)
    ticket_id     = Column(String, ForeignKey("tickets.id"), nullable=False)
    author_id     = Column(String, ForeignKey("users.id"))
    body          = Column(Text, nullable=False)
    is_internal   = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=now)

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
