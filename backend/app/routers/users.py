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
    password: str
    role: str = "technician"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    tenant_id: str
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
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden crear usuarios")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="El email ya esta registrado")
    new_user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        tenant_id=current_user.tenant_id,
        is_active=True,
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
    if payload.role is not None:
        if current_user.role != "admin": raise HTTPException(status_code=403, detail="Solo admins pueden cambiar roles")
        user.role = payload.role
    if payload.is_active is not None:
        if current_user.role != "admin": raise HTTPException(status_code=403, detail="Solo admins pueden activar/desactivar")
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
