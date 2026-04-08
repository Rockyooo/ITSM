from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import Tenant, User, Ticket, TenantUserPermission
from app.routers.auth import get_current_user
import uuid, re

router = APIRouter(prefix="/api/v1/tenants", tags=["tenants"])

GLOBAL_ROLES = {"superadmin", "admin"}

class TenantCreate(BaseModel):
    name: str
    domain: str
    logo_url: Optional[str] = None

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None

class TenantResponse(BaseModel):
    id: str
    name: str
    slug: str
    domain: Optional[str]
    logo_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    total_users: Optional[int] = 0
    total_tickets: Optional[int] = 0
    class Config:
        from_attributes = True

def require_global_admin(current_user: User = Depends(get_current_user)):
    if current_user.role not in GLOBAL_ROLES:
        raise HTTPException(status_code=403, detail="Solo administradores de Fusion I.T. pueden gestionar empresas")
    return current_user

def generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    return slug[:50]

def enrich_tenant(tenant: Tenant, db: Session) -> dict:
    data = {c.name: getattr(tenant, c.name) for c in tenant.__table__.columns}
    data["logo_url"] = None
    data["total_users"] = db.query(User).filter(
        User.tenant_id == tenant.id, User.is_active == True
    ).count()
    data["total_tickets"] = db.query(Ticket).filter(
        Ticket.tenant_id == tenant.id
    ).count()
    return data

@router.get("/", response_model=List[TenantResponse])
def list_tenants(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_global_admin),
):
    tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).all()
    return [enrich_tenant(t, db) for t in tenants]

@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_global_admin),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return enrich_tenant(tenant, db)

@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    payload: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_global_admin),
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Solo superadmin puede crear empresas")

    # Validar dominio unico
    existing = db.query(Tenant).filter(Tenant.domain == payload.domain.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una empresa con ese dominio")

    slug = generate_slug(payload.name)
    # Si el slug ya existe agregar sufijo
    base_slug = slug
    counter = 1
    while db.query(Tenant).filter(Tenant.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    tenant = Tenant(
        id=str(uuid.uuid4()),
        name=payload.name,
        slug=slug,
        domain=payload.domain.lower(),
        is_active=True,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return enrich_tenant(tenant, db)

@router.patch("/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: str,
    payload: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_global_admin),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if payload.name is not None:
        tenant.name = payload.name
    if payload.domain is not None:
        existing = db.query(Tenant).filter(
            Tenant.domain == payload.domain.lower(),
            Tenant.id != tenant_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Dominio ya en uso por otra empresa")
        tenant.domain = payload.domain.lower()
    if payload.is_active is not None:
        if current_user.role != "superadmin":
            raise HTTPException(status_code=403, detail="Solo superadmin puede activar/desactivar empresas")
        tenant.is_active = payload.is_active

    db.commit()
    db.refresh(tenant)
    return enrich_tenant(tenant, db)

@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_global_admin),
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Solo superadmin puede desactivar empresas")
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    tenant.is_active = False
    db.commit()
