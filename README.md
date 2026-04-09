# ITSM Fusion I.T.

Sistema de Gestión de Servicios de TI moderno (Help Desk) con capacidades Multi-Tenant, Inventario y Chat embebido con adjuntos.

## Arquitectura

- **Frontend:** React + TypeScript + Vite + Tailwind v4 + Zustand + TanStack Query.
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL.
- **Servicios Integrados:** 
  - AWS S3 / Almacenamiento local (Manejo de adjuntos de tickets).
  - Microsoft Graph API (Opcional - Envío de correos y threading).

## Guía Rapida de Inicio

1. **Base de Datos**
   Asegúrate de contar con PostgresSQL.

2. **Backend Config**
   Copia el archivo `backend/.env.example` a `backend/.env` y ajusta las variables correspondientes.
   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

3. **Frontend Config**
   Copia `frontend/.env.example` a `frontend/.env`.
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

El proyecto estará disponible en *http://localhost:5173*.
