from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import Ticket, User, TenantUserPermission, TicketMessage
from app.routers.auth import get_current_user
from app.services.graph_email import send_graph_email
import uuid

router = APIRouter(prefix="/api/v1/tickets", tags=["tickets"])

GLOBAL_ROLES = {"superadmin", "admin"}

# -- Schemas --------------------------------------------------
class TicketCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    ticket_type: Optional[str] = "incident"
    category: Optional[str] = None

class TicketStatusUpdate(BaseModel):
    status: str

class TicketAssign(BaseModel):
    assigned_to: str

class TicketMerge(BaseModel):
    target_ticket_id: str

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
    merged_into_id: Optional[str] = None
    merged_into_ticket_number: Optional[str] = None
    merged_at: Optional[datetime] = None
    assignee_name: Optional[str] = None
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True

# -- Helpers ---------------------------------------------------
VALID_STATUSES = ["open", "in_progress", "pending", "resolved", "closed"]
VALID_TRANSITIONS = {
    "open":        ["in_progress", "closed"],
    "in_progress": ["pending", "resolved", "closed"],
    "pending":     ["in_progress", "closed"],
    "resolved":    ["closed", "open"],
    "closed":      ["open"],
}

def get_accessible_tenant_ids(user: User, db: Session) -> List[str]:
    """Retorna lista de tenant_ids accesibles segun el rol del usuario."""
    if user.role in GLOBAL_ROLES:
        from app.models import Tenant
        return [t.id for t in db.query(Tenant).filter_by(is_active=True).all()]
    if user.role == "client":
        return [user.tenant_id]
    # technician y supervisor  solo tenants asignados explicitamente
    perms = db.query(TenantUserPermission).filter(
        TenantUserPermission.user_id == user.id
    ).all()
    tenant_ids = [p.tenant_id for p in perms]
    # siempre incluye su propio tenant
    if user.tenant_id not in tenant_ids:
        tenant_ids.append(user.tenant_id)
    return tenant_ids

def enrich_ticket(ticket: Ticket, db: Session) -> dict:
    """Agrega el nombre del tecnico asignado al ticket."""
    data = {c.name: getattr(ticket, c.name) for c in ticket.__table__.columns}
    if ticket.assigned_to:
        tech = db.query(User).filter(User.id == ticket.assigned_to).first()
        data["assignee_name"] = tech.full_name if tech else None
    else:
        data["assignee_name"] = None
    if ticket.merged_into_id:
        merged_target = db.query(Ticket).filter(Ticket.id == ticket.merged_into_id).first()
        data["merged_into_ticket_number"] = merged_target.ticket_number if merged_target else None
    else:
        data["merged_into_ticket_number"] = None
    return data

from sqlalchemy import text

def generate_ticket_number(db: Session) -> str:
    try:
        db.execute(text("CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1"))
        db.commit()
        next_val = db.execute(text("SELECT nextval('ticket_number_seq')")).scalar()
        return f"TKT-{str(next_val).zfill(6)}"
    except Exception:
        # Fallback si no es postgresql o hay error
        db.rollback()
        count = db.query(Ticket).count()
        return f"TKT-{str(count + 1).zfill(6)}"

# -- Endpoints -------------------------------------------------

@router.post("", status_code=201, response_model=TicketResponse)
def create_ticket(
    req: TicketCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ticket = Ticket(
            id=str(uuid.uuid4()),
            ticket_number=generate_ticket_number(db),
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
        
        email_body = f"<p>Hola {current_user.full_name},</p><p>Tu ticket <b>{ticket.ticket_number}</b> ha sido creado exitosamente.</p>"
        background_tasks.add_task(send_graph_email, current_user.email, f"Nuevo Ticket: {ticket.title}", email_body, ticket.ticket_number, False)
        
        return enrich_ticket(ticket, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[TicketResponse])
def list_tickets(
    status: Optional[str] = None,
    ticket_type: Optional[str] = None,
    priority: Optional[str] = None,
    tenant_id: Optional[str] = Query(None, description="Filtrar por empresa especifica"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accessible = get_accessible_tenant_ids(current_user, db)

    # Si pide un tenant especifico verificar que tiene acceso
    if tenant_id:
        if tenant_id not in accessible:
            raise HTTPException(status_code=403, detail="Sin acceso a esta empresa")
        filter_tenants = [tenant_id]
    else:
        filter_tenants = accessible

    query = db.query(Ticket).filter(Ticket.tenant_id.in_(filter_tenants))
    if status:      query = query.filter(Ticket.status == status)
    if ticket_type: query = query.filter(Ticket.ticket_type == ticket_type)
    if priority:    query = query.filter(Ticket.priority == priority)

    tickets = query.order_by(Ticket.created_at.desc()).offset(skip).limit(limit).all()
    return [enrich_ticket(t, db) for t in tickets]

@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accessible = get_accessible_tenant_ids(current_user, db)
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id.in_(accessible)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return enrich_ticket(ticket, db)

@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_status(
    ticket_id: str,
    req: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # supervisor NO puede cambiar estado
    if current_user.role == "supervisor":
        raise HTTPException(status_code=403, detail="Supervisores no pueden cambiar el estado del ticket")

    accessible = get_accessible_tenant_ids(current_user, db)
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id.in_(accessible)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    if req.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Estado invalido. Valores: {VALID_STATUSES}")
    allowed = VALID_TRANSITIONS.get(ticket.status, [])
    if req.status not in allowed:
        raise HTTPException(status_code=400,
            detail=f"Transicion invalida: {ticket.status} -> {req.status}. Permitidas: {allowed}")
    if req.status != ticket.status:
        db.add(TicketMessage(
            id=str(uuid.uuid4()),
            ticket_id=ticket.id,
            author_id=current_user.id,
            body=f"El estado cambio a {req.status.upper()}",
            message_type="alert",
            is_internal=False,
            is_alert=True,
            created_at=datetime.utcnow()
        ))
    
    ticket.status = req.status
    ticket.updated_at = datetime.utcnow()
    if req.status == "resolved":
        ticket.resolved_at = datetime.utcnow()
        
    db.commit()
    db.refresh(ticket)
    return enrich_ticket(ticket, db)

@router.patch("/{ticket_id}/assign", response_model=TicketResponse)
def assign_ticket(
    ticket_id: str,
    req: TicketAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Solo admin y superadmin pueden asignar  supervisor NO
    if current_user.role not in GLOBAL_ROLES | {"technician"}:
        raise HTTPException(403, "Sin permisos para asignar tickets")

    accessible = get_accessible_tenant_ids(current_user, db)
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id.in_(accessible)
    ).first()
    if not ticket:
        raise HTTPException(404, "Ticket no encontrado")

    tecnico = db.query(User).filter(User.id == req.assigned_to).first()
    if not tecnico:
        raise HTTPException(404, "Tecnico no encontrado")

    if ticket.assigned_to != req.assigned_to:
        db.add(TicketMessage(
            id=str(uuid.uuid4()),
            ticket_id=ticket.id,
            author_id=current_user.id,
            body=f"Ticket asignado a {tecnico.full_name}",
            message_type="alert",
            is_internal=False,
            is_alert=True,
            created_at=datetime.utcnow()
        ))

    ticket.assigned_to = req.assigned_to
    if ticket.status == "open":
        ticket.status = "in_progress"
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return enrich_ticket(ticket, db)

@router.delete("/{ticket_id}", status_code=204)
def close_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accessible = get_accessible_tenant_ids(current_user, db)
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id.in_(accessible)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    ticket.status = "closed"
    ticket.updated_at = datetime.utcnow()
    db.commit()

@router.post("/{ticket_id}/merge", response_model=TicketResponse)
def merge_ticket(
    ticket_id: str,
    req: TicketMerge,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in GLOBAL_ROLES | {"technician"}:
        raise HTTPException(status_code=403, detail="Sin permisos para fusionar tickets")

    if ticket_id == req.target_ticket_id:
        raise HTTPException(status_code=400, detail="No puedes fusionar un ticket consigo mismo")

    accessible = get_accessible_tenant_ids(current_user, db)
    source = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id.in_(accessible)
    ).first()
    if not source:
        raise HTTPException(status_code=404, detail="Ticket origen no encontrado")

    target = db.query(Ticket).filter(
        Ticket.id == req.target_ticket_id,
        Ticket.tenant_id.in_(accessible)
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Ticket destino no encontrado")

    if source.tenant_id != target.tenant_id:
        raise HTTPException(status_code=400, detail="Solo puedes fusionar tickets de la misma empresa")
    if source.merged_into_id:
        raise HTTPException(status_code=400, detail="El ticket origen ya fue fusionado")
    if target.merged_into_id:
        raise HTTPException(status_code=400, detail="El ticket destino ya fue fusionado a otro ticket")

    now = datetime.utcnow()
    source.status = "closed"
    source.updated_at = now
    source.resolved_at = now
    source.merged_into_id = target.id
    source.merged_at = now

    db.add(TicketMessage(
        id=str(uuid.uuid4()),
        ticket_id=source.id,
        author_id=current_user.id,
        body=f"Ticket fusionado en {target.ticket_number}.",
        is_internal=True,
        message_type="merge",
        created_at=now,
    ))
    db.add(TicketMessage(
        id=str(uuid.uuid4()),
        ticket_id=target.id,
        author_id=current_user.id,
        body=f"Se fusiono {source.ticket_number} en este ticket.",
        is_internal=True,
        message_type="merge",
        created_at=now,
    ))

    db.commit()
    db.refresh(source)
    return enrich_ticket(source, db)
