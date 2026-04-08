"""
app/permissions.py
Middleware y helpers de verificacion de permisos por tenant.

Roles globales:
  superadmin  ? acceso total a todos los tenants
  admin       ? acceso total a su tenant
  technician  ? acceso a tenants asignados via TenantUserPermission
  supervisor  ? solo lectura + comentarios en su tenant
  client      ? solo sus propios tickets

Permisos disponibles en TenantUserPermission.permissions:
  view_tickets    ? ver tickets del tenant
  manage_tickets  ? asignar, cambiar estado
  view_inventory  ? ver inventario
  view_reports    ? ver reportes e indicadores
  post_comments   ? comentar y generar alertas (supervisor)
"""

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, TenantUserPermission
from app.routers.auth import get_current_user
from typing import List


# Roles que pertenecen a Fusion I.T. y tienen acceso global
GLOBAL_ROLES = {"superadmin", "admin"}

# Permisos por defecto segun rol global
DEFAULT_PERMISSIONS = {
    "superadmin": ["view_tickets", "manage_tickets", "view_inventory", "view_reports", "post_comments", "manage_tenants"],
    "admin":      ["view_tickets", "manage_tickets", "view_inventory", "view_reports", "post_comments"],
    "technician": ["view_tickets", "manage_tickets", "view_inventory", "view_reports", "post_comments"],
    "supervisor": ["view_tickets", "view_reports", "post_comments"],
    "client":     ["view_tickets"],
}


def get_user_permissions_for_tenant(user: User, tenant_id: str, db: Session) -> List[str]:
    """
    Retorna la lista de permisos que tiene un usuario sobre un tenant especifico.
    - superadmin/admin ? permisos totales en cualquier tenant
    - technician/supervisor ? solo los permisos asignados explicitamente
    - client ? solo view_tickets de su propio tenant
    """
    if user.role in GLOBAL_ROLES:
        return DEFAULT_PERMISSIONS[user.role]

    if user.role == "client":
        if user.tenant_id == tenant_id:
            return DEFAULT_PERMISSIONS["client"]
        return []

    # technician y supervisor — verificar asignacion explicita
    perm = db.query(TenantUserPermission).filter(
        TenantUserPermission.user_id == user.id,
        TenantUserPermission.tenant_id == tenant_id,
    ).first()

    if not perm:
        return []

    return perm.permissions or DEFAULT_PERMISSIONS.get(user.role, [])


def require_permission(permission: str, tenant_id: str):
    """
    Dependency de FastAPI que verifica que el usuario tiene
    el permiso requerido sobre el tenant especificado.

    Uso:
      @router.get("/tickets")
      def list_tickets(
          tenant_id: str,
          _: None = Depends(require_permission("view_tickets", tenant_id))
      ):
    """
    def checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        perms = get_user_permissions_for_tenant(current_user, tenant_id, db)
        if permission not in perms:
            raise HTTPException(
                status_code=403,
                detail=f"No tienes permiso '{permission}' sobre este tenant"
            )
        return current_user
    return checker


def get_accessible_tenants(user: User, db: Session) -> List[str]:
    """
    Retorna la lista de tenant_ids a los que tiene acceso un usuario.
    - superadmin/admin ? todos los tenants activos
    - technician/supervisor ? solo los asignados
    - client ? solo su tenant
    """
    from app.models import Tenant

    if user.role in GLOBAL_ROLES:
        tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
        return [t.id for t in tenants]

    if user.role == "client":
        return [user.tenant_id]

    perms = db.query(TenantUserPermission).filter(
        TenantUserPermission.user_id == user.id
    ).all()
    return [p.tenant_id for p in perms]


def can_user_access_tenant(user: User, tenant_id: str, db: Session) -> bool:
    """Verificacion rapida — retorna True si el usuario puede acceder al tenant."""
    return tenant_id in get_accessible_tenants(user, db)
