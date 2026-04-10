from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.database import get_db, SessionLocal
from app.models import User, Ticket, Tenant, TicketMessage
from app.limiter import limiter
import uuid
from app.routers.tickets import generate_ticket_number

router = APIRouter(prefix="/api/v1/public", tags=["public"])

def add_internal_alert_task(ticket_id: str, email: str):
    db = SessionLocal()
    try:
        msg = TicketMessage(
            id=str(uuid.uuid4()),
            ticket_id=ticket_id,
            author_id=None,
            body=f"ATENCION: El usuario {email} es nuevo y fue auto-registrado. Favor validar y completar su perfil en la empresa correspondiente.",
            message_type="alert",
            is_internal=True,
            is_alert=True
        )
        db.add(msg)
        db.commit()
    finally:
        db.close()

class PublicTicketCreate(BaseModel):
    full_name: str
    email: EmailStr
    ticket_type: str        # incident | request | query
    category: str
    description: str
    is_urgent: bool = False
    urgent_reason: Optional[str] = None
    priority: Optional[str] = None

class PublicTicketResponse(BaseModel):
    ticket_number: str
    status: str
    title: str
    created_at: datetime
    class Config:
        from_attributes = True


def resolve_tenant_by_email(email: str, db: Session) -> Optional[Tenant]:
    if "@" not in email:
        return None
    domain = email.split("@")[-1].lower().strip()
    return db.query(Tenant).filter(Tenant.domain == domain).first()

@router.post("/tickets", response_model=PublicTicketResponse, status_code=201)
@limiter.limit("10/minute")
def create_public_ticket(request: Request, payload: PublicTicketCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Resolver tenant por dominio del correo
    tenant = resolve_tenant_by_email(payload.email, db)
    if not tenant:
        raise HTTPException(
            status_code=400,
            detail="No se encontro una empresa registrada valida para este dominio de correo"
        )

    # Buscar o crear usuario guest
    user = db.query(User).filter(User.email == payload.email).first()
    is_new_user = False
    if not user:
        is_new_user = True
        user = User(
            id=str(uuid.uuid4()),
            email=payload.email,
            full_name=payload.full_name,
            hashed_password="",
            role="client",
            tenant_id=tenant.id,
            is_active=True,
        )
        db.add(user)
        db.flush()

    # Prioridad
    priority = "critical" if payload.is_urgent else (payload.priority or "medium")

    # Titulo automatico
    title = f"{payload.category} - {payload.full_name}"

    ticket = Ticket(
        id=str(uuid.uuid4()),
        ticket_number=generate_ticket_number(db),
        tenant_id=tenant.id,
        requester_id=user.id,
        title=title,
        description=payload.description,
        status="open",
        priority=priority,
        ticket_type=payload.ticket_type,
        category=payload.category,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Detonador en background sin congelar el request
    if is_new_user:
        background_tasks.add_task(add_internal_alert_task, ticket.id, payload.email)

    return ticket

@router.get("/tickets/{ticket_number}", response_model=PublicTicketResponse)
@limiter.limit("30/minute")
def get_public_ticket(request: Request, ticket_number: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_number).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return ticket

@router.get("/user-info")
@limiter.limit("20/minute")
def get_user_info_by_email(request: Request, email: str, db: Session = Depends(get_db)):
    """Retorna nombre y equipo asignado del usuario para autocompletar el wizard."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"found": False}
    return {
        "found": True,
        "full_name": user.full_name,
        "tenant_id": user.tenant_id,
    }
