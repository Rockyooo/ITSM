"""
app/dependencies/tenant_guard.py
─────────────────────────────────
Dependencias centralizadas para control de acceso multi-tenant.

Uso:
    from app.dependencies.tenant_guard import require_permission, require_global_admin

    @router.get("/algo")
    def endpoint(
        tenant_id: str,
        user = Depends(require_permission("view_tickets")),
    ):
        ...
"""
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Tenant, TenantUserPermission
from app.routers.auth import get_current_user

GLOBAL_ROLES = {"superadmin", "admin"}

VALID_PERMISSIONS = {
    "view_tickets",
    "manage_tickets",
    "comment_tickets",
    "alert_team",
    "view_reports",
    "view_inventory",
    "post_comments",
}

# Técnicos conservan gestión de tickets sin fila explícita (compat con API previa)
_MANAGE_TICKETS_ROLE_BYPASS = {"technician"}


def user_has_tenant_permission(
    permission: str,
    tenant_id: str,
    db: Session,
    current_user: User,
) -> bool:
    """True si el usuario puede actuar con `permission` sobre `tenant_id`."""
    if current_user.role in GLOBAL_ROLES:
        return True
    if permission == "manage_tickets" and current_user.role in _MANAGE_TICKETS_ROLE_BYPASS:
        return True
    perm_row = db.query(TenantUserPermission).filter(
        TenantUserPermission.user_id == current_user.id,
        TenantUserPermission.tenant_id == tenant_id,
    ).first()
    return bool(perm_row and permission in (perm_row.permissions or []))


def assert_user_can_manage_tickets(
    tenant_id: str,
    db: Session,
    current_user: User,
) -> None:
    """
    Requisito equivalente a require_permission('manage_tickets') cuando el tenant
    se conoce solo tras cargar el ticket (PATCH assign/status, POST merge).
    """
    if not user_has_tenant_permission("manage_tickets", tenant_id, db, current_user):
        raise HTTPException(
            status_code=403,
            detail="Se requiere permiso 'manage_tickets' en esta empresa",
        )


def require_global_admin(current_user: User = Depends(get_current_user)) -> User:
    """Solo superadmin o admin pueden pasar."""
    if current_user.role not in GLOBAL_ROLES:
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    return current_user


def require_permission(permission: str):
    """
    Factory que devuelve una dependencia FastAPI que verifica un permiso
    especifico del usuario sobre un tenant.

    Superadmin y admin pasan siempre.
    Technician/supervisor deben tener el permiso asignado en tenant_user_permissions.
    """
    def _check(
        tenant_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> User:
        if not user_has_tenant_permission(permission, tenant_id, db, current_user):
            raise HTTPException(
                status_code=403,
                detail=f"Se requiere permiso '{permission}' en esta empresa",
            )
        return current_user
    return _check


def get_accessible_tenant_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[str]:
    """
    Dependencia que retorna la lista de tenant_ids accesibles para el usuario.
    Puede inyectarse directamente en endpoints que necesiten filtrar por tenant.
    """
    if current_user.role in GLOBAL_ROLES:
        return [t.id for t in db.query(Tenant).filter_by(is_active=True).all()]
    if current_user.role == "client":
        return [current_user.tenant_id]
    perms = db.query(TenantUserPermission).filter(
        TenantUserPermission.user_id == current_user.id
    ).all()
    tenant_ids = [p.tenant_id for p in perms]
    if current_user.tenant_id not in tenant_ids:
        tenant_ids.append(current_user.tenant_id)
    return tenant_ids


def verify_tenant_access(
    tenant_id: str,
    current_user: User,
    db: Session,
) -> None:
    """
    Verifica que el usuario tenga acceso a un tenant especifico.
    Lanza 403 si no tiene acceso. Util para llamadas imperativas (no Depends).
    """
    if current_user.role in GLOBAL_ROLES:
        return
    if current_user.role == "client" and current_user.tenant_id == tenant_id:
        return
    perm = db.query(TenantUserPermission).filter(
        TenantUserPermission.user_id == current_user.id,
        TenantUserPermission.tenant_id == tenant_id,
    ).first()
    if not perm:
        raise HTTPException(
            status_code=403,
            detail="Sin acceso a esta empresa"
        )
