# Resumen para retomar — ITSM Fusion I.T. — Sesion 2

## URLs activas
- Frontend: `https://itsm-nine.vercel.app`
- Backend API: `https://itsm-production-1027.up.railway.app`
- Swagger: `https://itsm-production-1027.up.railway.app/docs`
- Wizard publico: `https://itsm-nine.vercel.app/nuevo-ticket`

## Credenciales de prueba
- Email: `admin@fusion-it.co`
- Password: `FusionIT2026!`
- Tenant ID: `tenant-001` — dominio `fusion-it.co`
- Tenant prueba: `tenant-prueba` — dominio `fusion-prueba.co`

## Stack
- Frontend: React + Vite + Zustand + Axios → Vercel
- Backend: FastAPI Python → Railway
- BD: PostgreSQL → Railway
- Repo: `github.com/Rockyooo/ITSM`
- Local: `C:\Users\¡ROCKIE!\ITSM`

---

## Lo que quedo funcionando esta sesion

| Modulo | Estado | Notas |
|---|---|---|
| Router `/api/v1/users` + `/technicians` | Produccion | users.py creado |
| Modal asignacion de tecnico en Dashboard | Produccion | AssignTechnicianModal.tsx |
| Wizard publico `/nuevo-ticket` — 4 pasos | Produccion | NuevoTicket.tsx |
| Multi-tenant por dominio de correo | Produccion | campo domain en Tenant |
| Endpoint publico POST /public/tickets | Produccion | sin auth |
| Endpoint publico GET /public/tickets/{tkt} | Produccion | consulta por numero |
| Migracion columna domain en tenants | Produccion | startup event en main.py |
| Tenant prueba fusion-prueba.co | Produccion | creado via startup |
| vercel.json SPA rewrites | Produccion | en frontend/ |

---

## Bugs conocidos — pendientes

1. **Iconos del sidebar muestran `??`** — emojis corruptos por encoding PowerShell
   - Fix: reemplazar emojis por SVG o lucide-react
   - Archivo: `frontend/src/pages/Dashboard.tsx`

2. **TKT- pierde simbolos en la lista** — mismo problema de encoding
   - Fix: limpiar string literals con caracteres no ASCII

3. **Regla establecida: sin tildes en strings del frontend**
   - Todos los textos creados via PowerShell deben omitir tildes

---

## Lo que quedo pendiente — proxima sesion

### Prioridad 1 — Modelo de permisos por empresa
Tabla nueva: `tenant_user_permissions`
```
id, user_id, tenant_id, permissions (JSON array), created_at
```

Pasos:
1. Agregar modelo en `backend/app/models.py`
2. Migracion via startup event en `main.py`
3. Middleware de verificacion de permisos por tenant
4. UI panel de asignacion de empresas a tecnicos (Dashboard superadmin)
5. Vista supervisor — solo lectura + comentarios + alertas

### Prioridad 2 — Inventario TI
- Endpoint `POST /api/v1/inventory/import` — subida de Excel
- Tabla `assets` ya existe en models.py
- UI modulo inventario en Dashboard

### Prioridad 3 — Bugs de encoding
- Fix iconos sidebar
- Fix caracteres TKT- en lista de tickets

---

## Modelo de roles definitivo

```
superadmin  → Fusion I.T. — control total, todos los tenants
admin       → Fusion I.T. — gestion completa
technician  → Fusion I.T. — ve y gestiona tickets de empresas asignadas
supervisor  → empresa cliente — solo lectura + comentarios + alertas al equipo
client      → usuario final — crea y consulta sus tickets
```

### Reglas inamovibles
- Solo superadmin/admin de Fusion I.T. crea tecnicos y supervisores
- supervisor NO puede: cambiar estado, asignar, ver otras empresas
- supervisor SI puede: ver tickets suyos, comentar, generar alertas al equipo tecnico
- Aislamiento multi-tenant absoluto
- Fusion I.T. siempre tiene control total

---

## Comandos para retomar

```powershell
# Abrir proyecto
code C:\Users\¡ROCKIE!\ITSM

# Correr frontend local
cd C:\Users\¡ROCKIE!\ITSM\frontend
npm run dev

# Push rapido
cd C:\Users\¡ROCKIE!\ITSM
git add .
git commit -m "mensaje"
git push origin main

# Login API
$login = Invoke-RestMethod `
  -Uri "https://itsm-production-1027.up.railway.app/api/v1/auth/login" `
  -Method POST -ContentType "application/x-www-form-urlencoded" `
  -Body "username=admin@fusion-it.co&password=FusionIT2026!"
$TOKEN = $login.access_token
$AUTH = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }
```

---

## Notas tecnicas criticas

- `hash_password` esta en `app/routers/auth.py` linea 31 — NO `get_password_hash`
- Import correcto: `from app.routers.auth import hash_password`
- Todos los IDs son `str` UUID — NUNCA `int` en schemas Pydantic ni path params
- Campo asignacion en Ticket: `assigned_to` — NO `assignee_id`
- Sin tildes en strings del frontend creados via PowerShell

*Sesion 2 — 08 Abril 2026*
