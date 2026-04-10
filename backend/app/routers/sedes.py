from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models import TenantSede, Tenant
from app.routers.auth import get_current_user, User
import uuid

router = APIRouter(prefix="/api/v1/tenants", tags=["sedes"])

class SedeCreate(BaseModel):
    name: str
    city: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_main: Optional[bool] = False

class SedeResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    city: str
    address: Optional[str]
    phone: Optional[str]
    is_main: bool
    is_active: bool
    created_at: Optional[datetime]
    class Config:
        from_attributes = True

@router.get("/{tenant_id}/sedes", response_model=list[SedeResponse])
def list_sedes(tenant_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in {"superadmin", "admin"} and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Sin acceso")
    return db.query(TenantSede).filter(TenantSede.tenant_id == tenant_id, TenantSede.is_active == True).order_by(TenantSede.is_main.desc(), TenantSede.name).all()

@router.post("/{tenant_id}/sedes", response_model=SedeResponse, status_code=201)
def create_sede(tenant_id: str, req: SedeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in {"superadmin", "admin"}:
        raise HTTPException(status_code=403, detail="Sin permisos")
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    sede = TenantSede(
        id=str(uuid.uuid4()), tenant_id=tenant_id,
        name=req.name, city=req.city, address=req.address,
        phone=req.phone, is_main=req.is_main, is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(sede)
    db.commit()
    db.refresh(sede)
    return sede

@router.patch("/{tenant_id}/sedes/{sede_id}", response_model=SedeResponse)
def update_sede(tenant_id: str, sede_id: str, req: SedeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in {"superadmin", "admin"}:
        raise HTTPException(status_code=403, detail="Sin permisos")
    sede = db.query(TenantSede).filter(TenantSede.id == sede_id, TenantSede.tenant_id == tenant_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    sede.name = req.name; sede.city = req.city
    sede.address = req.address; sede.phone = req.phone; sede.is_main = req.is_main
    db.commit(); db.refresh(sede)
    return sede

@router.delete("/{tenant_id}/sedes/{sede_id}", status_code=204)
def delete_sede(tenant_id: str, sede_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in {"superadmin", "admin"}:
        raise HTTPException(status_code=403, detail="Sin permisos")
    sede = db.query(TenantSede).filter(TenantSede.id == sede_id, TenantSede.tenant_id == tenant_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    sede.is_active = False
    db.commit()