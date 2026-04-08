"""
app/routers/permissions.py
CRUD de permisos de usuarios sobre tenants.
Solo superadmin y admin pueden gestionar permisos.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import User, Tenant, TenantUserPermission
from app.routers.auth import get_current_user
from app.permissions import get_accessible_tenants
import uuid

router = APIRouter(prefix="/api/v1/permissions", tags=["permissions"])

VALID_PERMISSIONS = [
    "view_tickets",
    "manage_tickets",
    "view_inventory",
    "view_reports",
    "post_comments",
]

class PermissionAssign(BaseModel):
    user_id: str
    tenant_id: str
    permissions: List[str]

class PermissionResponse(BaseModel):
    id: str
    user_id: str
    tenant_id: str
    permissions: List[str]
    created_at: datetime
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    tenant_name: Optional[str] = None
    class Config:
        from_attributes = True

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("superadmin", "admin"):
        raise HTTPException(status_code=403, detail="Solo administradores pueden gestionar permisos")
    return current_user

@router.get("/", response_model=List[PermissionResponse])
def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Lista todos los permisos asignados — enriquecidos con nombre de usuario y tenant."""
    perms = db.query(TenantUserPermission).all()
    result = []
    for p in perms:
        user = db.query(User).filter(User.id == p.user_id).first()
        tenant = db.query(Tenant).filter(Tenant.id == p.tenant_id).first()
        result.append(PermissionResponse(
            id=p.id,
            user_id=p.user_id,
            tenant_id=p.tenant_id,
            permissions=p.permissions or [],
            created_at=p.created_at,
            user_email=user.email if user else None,
            user_name=user.full_name if user else None,
            tenant_name=tenant.name if tenant else None,
        ))
    return result

@router.get("/my-tenants")
def my_accessible_tenants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna los tenants accesibles para el usuario autenticado con sus permisos."""
    from app.permissions import get_user_permissions_for_tenant
    tenant_ids = get_accessible_tenants(current_user, db)
    tenants = db.query(Tenant).filter(Tenant.id.in_(tenant_ids), Tenant.is_active == True).all()
    return [
        {
            "tenant_id": t.id,
            "tenant_name": t.name,
            "domain": t.domain,
            "permissions": get_user_permissions_for_tenant(current_user, t.id, db),
        }
        for t in tenants
    ]

@router.post("/", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
def assign_permission(
    payload: PermissionAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Asigna o actualiza permisos de un usuario sobre un tenant."""
    # Validar permisos
    invalid = [p for p in payload.permissions if p not in VALID_PERMISSIONS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Permisos invalidos: {invalid}")

    # Verificar que el usuario y tenant existen
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    tenant = db.query(Tenant).filter(Tenant.id == payload.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    # Upsert — si ya existe actualiza, sino crea
    existing = db.query(TenantUserPermission).filter(
        TenantUserPermission.user_id == payload.user_id,
        TenantUserPermission.tenant_id == payload.tenant_id,
    ).first()

    if existing:
        existing.permissions = payload.permissions
        db.commit()
        db.refresh(existing)
        perm = existing
    else:
        perm = TenantUserPermission(
            id=str(uuid.uuid4()),
            user_id=payload.user_id,
            tenant_id=payload.tenant_id,
            permissions=payload.permissions,
        )
        db.add(perm)
        db.commit()
        db.refresh(perm)

    return PermissionResponse(
        id=perm.id,
        user_id=perm.user_id,
        tenant_id=perm.tenant_id,
        permissions=perm.permissions,
        created_at=perm.created_at,
        user_email=user.email,
        user_name=user.full_name,
        tenant_name=tenant.name,
    )

@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_permission(
    permission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Revoca todos los permisos de un usuario sobre un tenant."""
    perm = db.query(TenantUserPermission).filter(TenantUserPermission.id == permission_id).first()
    if not perm:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")
    db.delete(perm)
    db.commit()
