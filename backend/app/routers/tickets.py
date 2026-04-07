from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models import Ticket, User
from app.routers.auth import get_current_user
import uuid

router = APIRouter(prefix="/api/v1/tickets", tags=["tickets"])

# ── Schemas ──────────────────────────────────────────────────
class TicketCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    ticket_type: Optional[str] = "incident"
    category: Optional[str] = None

class TicketStatusUpdate(BaseModel):
    status: str

class TicketResponse(BaseModel):
    id: str
    ticket_number: Optional[str]
    title: str
    description: Optional[str]
    status: str
    priority: str
    ticket_type: str
    category: Optional[str]
    tenant_id: str
    requester_id: Optional[str]
    assigned_to: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# ── Helpers ───────────────────────────────────────────────────
VALID_STATUSES = ["open", "in_progress", "pending", "resolved", "closed"]
VALID_TRANSITIONS = {
    "open":        ["in_progress", "closed"],
    "in_progress": ["pending", "resolved", "closed"],
    "pending":     ["in_progress", "closed"],
    "resolved":    ["closed", "open"],
    "closed":      ["open"],
}

def generate_ticket_number(db: Session, tenant_id: str) -> str:
    count = db.query(Ticket).filter(Ticket.tenant_id == tenant_id).count()
    return f"TKT-{str(count + 1).zfill(6)}"

# ── Endpoints ─────────────────────────────────────────────────

@router.post("", status_code=201, response_model=TicketResponse)
def create_ticket(
    req: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ticket = Ticket(
            id=str(uuid.uuid4()),
            ticket_number=generate_ticket_number(db, current_user.tenant_id),
            tenant_id=current_user.tenant_id,
            requester_id=current_user.id,
            title=req.title,
            description=req.description,
            priority=req.priority,
            ticket_type=req.ticket_type,
            category=req.category,
            status="open",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        return ticket
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=list[TicketResponse])
def list_tickets(
    status: Optional[str] = None,
    ticket_type: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Ticket).filter(Ticket.tenant_id == current_user.tenant_id)
    if status:
        query = query.filter(Ticket.status == status)
    if ticket_type:
        query = query.filter(Ticket.ticket_type == ticket_type)
    if priority:
        query = query.filter(Ticket.priority == priority)
    return query.order_by(Ticket.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return ticket

@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_status(
    ticket_id: str,
    req: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    if req.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Estado invalido. Valores: {VALID_STATUSES}")
    allowed = VALID_TRANSITIONS.get(ticket.status, [])
    if req.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Transicion invalida: {ticket.status} -> {req.status}. Permitidas: {allowed}"
        )
    ticket.status = req.status
    ticket.updated_at = datetime.utcnow()
    if req.status == "resolved":
        ticket.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return ticket

@router.delete("/{ticket_id}", status_code=204)
def close_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    ticket.status = "closed"
    ticket.updated_at = datetime.utcnow()
    db.commit()

class TicketAssign(BaseModel):
    assigned_to: str

@router.patch("/{ticket_id}/assign", response_model=TicketResponse)
def assign_ticket(
    ticket_id: str,
    req: TicketAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["admin", "supervisor"]:
        raise HTTPException(403, "Sin permisos para asignar tickets")
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    if not ticket:
        raise HTTPException(404, "Ticket no encontrado")
    tecnico = db.query(User).filter(
        User.id == req.assigned_to,
        User.tenant_id == current_user.tenant_id
    ).first()
    if not tecnico:
        raise HTTPException(404, "Tecnico no encontrado")
    ticket.assigned_to = req.assigned_to
    ticket.status = "in_progress"
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return ticket
