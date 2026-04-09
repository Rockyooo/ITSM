from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models import Ticket, TicketMessage, User
from app.routers.auth import get_current_user
from app.services.graph_email import send_graph_email
import uuid

router = APIRouter(prefix="/api/v1/tickets", tags=["messages"])

class MessageCreate(BaseModel):
    body: str
    is_internal: Optional[bool] = False
    is_alert: Optional[bool] = False
    message_type: Optional[str] = "comment"

class MessageResponse(BaseModel):
    id: str
    ticket_id: str
    author_id: Optional[str]
    body: str
    message_type: str
    is_internal: bool
    is_alert: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

@router.post("/{ticket_id}/messages", status_code=201, response_model=MessageResponse)
def add_message(
    ticket_id: str,
    req: MessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    normalized_type = (req.message_type or "comment").lower().strip()
    if normalized_type not in {"comment", "quote", "alert", "merge"}:
        raise HTTPException(status_code=400, detail="message_type invalido. Valores: comment|quote|alert|merge")

    if req.is_alert and normalized_type == "comment":
        normalized_type = "alert"

    msg = TicketMessage(
        id=str(uuid.uuid4()),
        ticket_id=ticket_id,
        author_id=current_user.id,
        body=req.body,
        message_type=normalized_type,
        is_internal=req.is_internal,
        is_alert=bool(req.is_alert) or normalized_type == "alert",
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    if not req.is_internal and ticket.status == "pending":
        ticket.status = "in_progress"
        ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)
    
    if not req.is_internal:
        requester = db.query(User).filter(User.id == ticket.requester_id).first()
        if requester and requester.id != current_user.id:
            email_body = f"<p><b>{current_user.full_name}</b> añadió un comentario:</p><blockquote>{req.body}</blockquote><p><br>Por favor responde ingresando al portal.</p>"
            background_tasks.add_task(send_graph_email, requester.email, f"Re: {ticket.title}", email_body, ticket.ticket_number, True)

    return msg

@router.get("/{ticket_id}/messages", response_model=list[MessageResponse])
def list_messages(
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
    return db.query(TicketMessage).filter(
        TicketMessage.ticket_id == ticket_id
    ).order_by(TicketMessage.created_at.asc()).all()
