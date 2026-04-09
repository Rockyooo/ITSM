from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import Asset, User
from app.routers.auth import get_current_user
from app.routers.tickets import get_accessible_tenant_ids
import uuid

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])

GLOBAL_ROLES = {"superadmin", "admin"}

class AssetCreate(BaseModel):
    name: str
    asset_type: Optional[str] = "unknown"
    serial_number: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = "active"
    tenant_id: Optional[str] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
    serial_number: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None

class AssetResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    asset_type: Optional[str]
    serial_number: Optional[str]
    assigned_to: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

@router.post("", status_code=201, response_model=AssetResponse)
def create_asset(
    req: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in GLOBAL_ROLES:
        raise HTTPException(status_code=403, detail="Sin permisos")
    target_tenant = req.tenant_id if current_user.role == "superadmin" and req.tenant_id else current_user.tenant_id
    asset = Asset(
        id=str(uuid.uuid4()),
        tenant_id=target_tenant,
        name=req.name,
        asset_type=req.asset_type,
        serial_number=req.serial_number,
        assigned_to=req.assigned_to,
        status=req.status,
        created_at=datetime.utcnow()
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset

@router.get("", response_model=List[AssetResponse])
def list_assets(
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accessible = get_accessible_tenant_ids(current_user, db)
    if tenant_id:
        if tenant_id not in accessible:
            raise HTTPException(status_code=403, detail="Sin acceso a esta empresa")
        query_tenants = [tenant_id]
    else:
        query_tenants = accessible
    return db.query(Asset).filter(Asset.tenant_id.in_(query_tenants)).order_by(Asset.created_at.desc()).all()

@router.patch("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: str,
    req: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in GLOBAL_ROLES:
        raise HTTPException(status_code=403, detail="Sin permisos")
    accessible = get_accessible_tenant_ids(current_user, db)
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.tenant_id.in_(accessible)).first()
    if not asset: raise HTTPException(404, "Activo no encontrado")
    
    update_data = req.dict(exclude_unset=True)
    for key, val in update_data.items():
        setattr(asset, key, val)
    db.commit()
    db.refresh(asset)
    return asset

@router.delete("/{asset_id}", status_code=204)
def delete_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in GLOBAL_ROLES:
        raise HTTPException(status_code=403, detail="Sin permisos")
    accessible = get_accessible_tenant_ids(current_user, db)
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.tenant_id.in_(accessible)).first()
    if not asset: raise HTTPException(404, "Activo no encontrado")
    db.delete(asset)
    db.commit()
