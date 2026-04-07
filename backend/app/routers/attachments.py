# ═══════════════════════════════════════════════════════════════
# app/routers/attachments.py
# Upload de archivos adjuntos a mensajes de tickets.
# Validación estricta antes de cualquier escritura.
# ═══════════════════════════════════════════════════════════════
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Attachment, Ticket, TicketMessage, User
from app.routers.auth import get_current_user
from app.services.storage import get_storage, validate_file, safe_filename
from datetime import datetime
import uuid, io, zipfile, json

router = APIRouter(prefix="/api/v1/tickets", tags=["attachments"])

@router.post("/{ticket_id}/messages/{message_id}/attachments", status_code=201)
async def upload_attachment(
    ticket_id: str,
    message_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verificar ticket pertenece al tenant
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    if not ticket:
        raise HTTPException(404, "Ticket no encontrado")

    # Leer archivo en memoria
    file_data = await file.read()

    # Validar antes de subir
    ok, error = validate_file(file.filename or "", file.content_type or "", len(file_data))
    if not ok:
        raise HTTPException(400, f"Archivo rechazado: {error}")

    # Generar nombre seguro — nunca usar el nombre original en disco
    stored_name = safe_filename(file.filename or "file")

    # Subir al storage configurado
    storage = get_storage()
    file_url = await storage.upload(file_data, stored_name, file.content_type or "")

    # Guardar metadata en BD
    attachment = Attachment(
        id=str(uuid.uuid4()),
        message_id=message_id,
        ticket_id=ticket_id,
        tenant_id=current_user.tenant_id,
        filename=file.filename,
        stored_name=stored_name,
        file_url=file_url,
        content_type=file.content_type,
        file_size=len(file_data),
        created_at=datetime.utcnow(),
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {
        "id": attachment.id,
        "filename": attachment.filename,
        "file_url": attachment.file_url,
        "content_type": attachment.content_type,
        "file_size": attachment.file_size,
    }

@router.get("/{ticket_id}/attachments")
def list_attachments(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos los adjuntos de un ticket."""
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    if not ticket:
        raise HTTPException(404, "Ticket no encontrado")

    attachments = db.query(Attachment).filter(
        Attachment.ticket_id == ticket_id
    ).order_by(Attachment.created_at.asc()).all()

    return [{
        "id": a.id,
        "message_id": a.message_id,
        "filename": a.filename,
        "file_url": a.file_url,
        "content_type": a.content_type,
        "file_size": a.file_size,
        "created_at": a.created_at,
    } for a in attachments]


@router.get("/{ticket_id}/export")
def export_ticket_history(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exporta historial completo del ticket como ZIP.
    Incluye: metadata JSON + todos los mensajes + lista de adjuntos.
    Los adjuntos se referencian por URL (no se re-descargan aquí).
    Para export masivo trimestral usar /api/v1/export/quarterly.
    """
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    if not ticket:
        raise HTTPException(404, "Ticket no encontrado")

    messages = db.query(TicketMessage).filter(
        TicketMessage.ticket_id == ticket_id
    ).order_by(TicketMessage.created_at.asc()).all()

    attachments = db.query(Attachment).filter(
        Attachment.ticket_id == ticket_id
    ).all()

    # Construir ZIP en memoria
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:

        # metadata.json
        metadata = {
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
            "type": ticket.ticket_type,
            "category": ticket.category,
            "created_at": str(ticket.created_at),
            "resolved_at": str(ticket.resolved_at),
        }
        zf.writestr("metadata.json", json.dumps(metadata, indent=2, ensure_ascii=False))

        # conversation.txt — hilo completo en texto plano
        lines = [f"TICKET: {ticket.ticket_number} — {ticket.title}\n", "=" * 60 + "\n\n"]
        for m in messages:
            tag = "[INTERNO]" if m.is_internal else "[PÚBLICO]"
            lines.append(f"{tag} {m.created_at}\n{m.body}\n\n{'-'*40}\n\n")
        zf.writestr("conversation.txt", "".join(lines))

        # attachments.json — lista con URLs para descarga posterior
        att_list = [{
            "filename": a.filename,
            "url": a.file_url,
            "type": a.content_type,
            "size_bytes": a.file_size,
            "uploaded_at": str(a.created_at),
        } for a in attachments]
        zf.writestr("attachments.json", json.dumps(att_list, indent=2, ensure_ascii=False))

    zip_buffer.seek(0)
    filename = f"{ticket.ticket_number}_export.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
