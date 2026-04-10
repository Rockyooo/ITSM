from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user, hash_password
import uuid

router = APIRouter(prefix="/api/v1/users", tags=["users"])

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    last_name: Optional[str] = None
    password: str
    role: str = "technician"
    phone: Optional[str] = None
    position: Optional[str] = None
    cedula: Optional[str] = None
    signature: Optional[str] = None
    photo_url: Optional[str] = None
    tenant_id: Optional[str] = None
    is_active: bool = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    cedula: Optional[str] = None
    signature: Optional[str] = None
    photo_url: Optional[str] = None
    tenant_id: Optional[str] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    last_name: Optional[str] = None
    role: str
    is_active: bool
    tenant_id: str
    phone: Optional[str] = None
    position: Optional[str] = None
    cedula: Optional[str] = None
    signature: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

@router.get("/technicians", response_model=List[UserResponse])
def list_technicians(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(User).filter(
        User.tenant_id == current_user.tenant_id,
        User.role.in_(["technician", "admin"]),
        User.is_active == True,
    ).all()

@router.get("/", response_model=List[UserResponse])
def list_users(
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(User).filter(User.tenant_id == current_user.tenant_id)
    if role: query = query.filter(User.role == role)
    if is_active is not None: query = query.filter(User.is_active == is_active)
    return query.offset(skip).limit(limit).all()

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id, User.tenant_id == current_user.tenant_id).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Solo administradores pueden crear usuarios")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="El email ya esta registrado")
    tenant_id = payload.tenant_id if (current_user.role == "superadmin" and payload.tenant_id) else current_user.tenant_id
    new_user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        full_name=payload.full_name,
        last_name=payload.last_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        tenant_id=tenant_id,
        phone=payload.phone,
        position=payload.position,
        cedula=payload.cedula,
        signature=payload.signature,
        photo_url=payload.photo_url,
        is_active=payload.is_active,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id, User.tenant_id == current_user.tenant_id).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Sin permisos")
    if payload.full_name is not None: user.full_name = payload.full_name
    if payload.last_name is not None: user.last_name = payload.last_name
    if payload.phone is not None: user.phone = payload.phone
    if payload.position is not None: user.position = payload.position
    if payload.cedula is not None: user.cedula = payload.cedula
    if payload.signature is not None: user.signature = payload.signature
    if payload.photo_url is not None: user.photo_url = payload.photo_url
    if payload.password is not None and payload.password.strip(): user.hashed_password = hash_password(payload.password)
    if payload.tenant_id is not None and current_user.role == "superadmin": user.tenant_id = payload.tenant_id
    if payload.role is not None:
        if current_user.role not in ("admin", "superadmin"): raise HTTPException(status_code=403, detail="Solo admins pueden cambiar roles")
        user.role = payload.role
    if payload.is_active is not None:
        if current_user.role not in ("admin", "superadmin"): raise HTTPException(status_code=403, detail="Solo admins pueden activar/desactivar")
        user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Solo admins")
    if current_user.id == user_id: raise HTTPException(status_code=400, detail="No puedes desactivarte a ti mismo")
    user = db.query(User).filter(User.id == user_id, User.tenant_id == current_user.tenant_id).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.is_active = False
    db.commit()

