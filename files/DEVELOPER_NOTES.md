# 📘 ITSM Fusion I.T. — Notas Técnicas del Desarrollador

> Este documento acumula decisiones de arquitectura, convenciones de código y advertencias
> importantes descubiertas durante el desarrollo. Actualizar en cada sesión.

---

## 🔐 Autenticación (`app/routers/auth.py`)

### Función de hash de contraseñas

| Detalle | Valor |
|---|---|
| **Archivo** | `app/routers/auth.py` |
| **Línea aprox.** | 31 |
| **Nombre correcto** | `hash_password` |
| **Nombre incorrecto** ❌ | `get_password_hash` ← causaría `ImportError` en runtime |

**Import correcto** cuando necesites hashear contraseñas desde otro módulo:

```python
from app.routers.auth import hash_password
```

**Contexto:** El import se hace *dentro de la función* `create_user` en `app/routers/users.py`
para evitar circular imports, ya que `auth.py` podría en el futuro necesitar importar
desde `users.py`.

```python
# app/routers/users.py — dentro de def create_user(...)
from app.routers.auth import hash_password
new_user = User(hashed_password=hash_password(payload.password), ...)
```

> **Refactor futuro:** Si se mueve `hash_password` a un módulo utilitario
> (p.ej. `app/utils/security.py`), actualizar este import en `users.py` y aquí.

---

## 🗃️ Modelos — Tipos de datos críticos

### IDs son String (UUID), NO Integer

| Campo | Tipo real | Error común |
|---|---|---|
| `User.id` | `String` (UUID v4) | Declarar como `int` en Pydantic → `ValidationError` / `500` |
| `Ticket.id` | `String` (UUID v4) | Igual |
| `Tenant.id` | `String` (UUID v4) | Igual |

**Siempre usar `str` en schemas Pydantic para IDs:**

```python
# ✅ Correcto
class UserResponse(BaseModel):
    id: str  # UUID como string

# ❌ Incorrecto — causa 500 en runtime
class UserResponse(BaseModel):
    id: int
```

**Path params también deben ser `str`:**
```python
# ✅
@router.get("/{user_id}")
def get_user(user_id: str, ...):

# ❌
def get_user(user_id: int, ...):
```

**Campo de asignación en Ticket:**
```python
Ticket.assigned_to  # ← nombre correcto (no assignee_id)
```

> **Origen:** Bug descubierto al crear `users.py` — el 500 en `/api/v1/users/technicians`
> fue causado por `id: int` en `UserResponse` cuando el modelo usa `String` UUID.

---

## 📁 Estructura de routers

Los routers se registran en `app/main.py`. Lista actualizada:

```python
from app.routers import auth, tickets, messages, attachments, users

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(messages.router)
app.include_router(attachments.router)
app.include_router(users.router)
```

---

## 🐛 Bugs conocidos — pendientes para mejora

### 1. Iconos del sidebar muestran `??`
- **Causa:** Emojis en el JSX se corrompen al pasar por `Set-Content` de PowerShell (encoding Windows-1252 vs UTF-8)
- **Archivo:** `frontend/src/pages/Dashboard.tsx` — sección sidebar icons
- **Fix pendiente:** Reemplazar emojis por iconos SVG o libreria como `lucide-react`

### 2. Numero de ticket `TKT-` pierde simbolos especiales
- **Causa:** Mismo problema de encoding — caracteres especiales corruptos al crear el archivo via PowerShell
- **Archivo:** `frontend/src/pages/Dashboard.tsx`
- **Fix pendiente:** Revisar y limpiar todos los string literals con caracteres no ASCII en el Dashboard

### 3. Convension: sin tildes en strings del frontend
- **Regla:** Omitir tildes en textos del codigo para evitar corrupcion por encoding
- **Ejemplo:** `"Tecnico"` no `"Técnico"`, `"Critica"` no `"Crítica"`
- **Aplicar en:** Todos los archivos `.tsx` creados via PowerShell

---

## 🗒️ Pendientes / TODO

- [ ] Mover `hash_password` a `app/utils/security.py` en refactor de seguridad
- [ ] Documentar convenciones de naming para schemas Pydantic
- [ ] Agregar notas sobre variables de entorno Railway
- [ ] Fix encoding sidebar icons (reemplazar emojis por SVG/lucide-react)
- [ ] Fix encoding TKT- ticket number display
- [ ] Limpiar todos los string literals con tildes en Dashboard.tsx

---

*Ultima actualizacion: sesion wizard de tickets y vision outsourcing*

---

## Wizard publico de creacion de tickets

### URL
`/nuevo-ticket` - publica, sin login requerido

### Flujo de 4 pasos
- Paso 1: Tipo → Incidente / Requerimiento / Consulta (tarjetas grandes con icono y descripcion)
- Paso 2: Categoria → dinamica segun tipo + checkbox URGENTE con campo "Por que es urgente?"
- Paso 3: Evidencia → descripcion libre (min 20 chars) + foto/galeria + video max 20 seg
- Paso 4: Confirmacion → TKT-XXXXXX + resumen + boton consultar estado

### Logica de asociacion por correo corporativo
1. Usuario escribe correo corporativo
2. Sistema busca en tabla `users` por email → autocompleta nombre y equipo asignado
3. Si no existe → crea registro guest con ese correo
4. Tenant se asocia por dominio del correo (ej: @empresa.com → tenant de esa empresa)
5. Requiere campo `domain` en tabla `Tenant` (pendiente migrar)

### Campo URGENTE
- Checkbox en paso 2
- Si activa → campo obligatorio "Por que es urgente?" (min 10 chars)
- Asigna prioridad `critical` automaticamente al ticket

### Storage — decision
- Demo actual: Railway filesystem (ya funciona)
- Produccion VPS: carpeta /data del servidor
- Liberacion de almacenamiento: ZIP export por ticket (ya implementado)
- Video: max 20 segundos (casos pantallazos, error BIOS, equipo reiniciando)

### Numero de ticket
- Mantener formato TKT-000001 (legible para comunicar por telefono o WhatsApp)
- UUID solo para uso interno de la BD

### WhatsApp — estrategia
- Fase 1 (ahora): link directo al wizard — responsive, funciona en celular, costo cero
- Fase 2 (futuro): bot Meta Business API

### Pendientes backend para el wizard
- [x] Agregar campo `domain` a tabla `Tenant` — HECHO
- [x] Endpoint publico POST /api/v1/public/tickets — HECHO
- [x] Endpoint publico GET /api/v1/public/tickets/{ticket_number} — HECHO
- [ ] Endpoint POST /api/v1/inventory/import (subida de Excel con usuarios y equipos asignados)

---

## Modelo de roles definitivo

### Jerarquia de control
```
superadmin  → Fusion I.T. — control total, todos los tenants
admin       → Fusion I.T. — gestion completa de su operacion
technician  → Fusion I.T. — ve y gestiona tickets de empresas asignadas
supervisor  → empresa cliente — solo lectura de SU empresa, sin cambios
client      → usuario final — crea tickets y consulta los suyos
```

### Reglas de negocio inamovibles
- Solo superadmin/admin de Fusion I.T. asigna permisos y crea tecnicos
- El supervisor de empresa cliente lo crea el superadmin a peticion del cliente
- supervisor = solo view_tickets de su tenant, CERO manage
- technician ve TODOS los tickets de los tenants que tiene asignados
- Aislamiento multi-tenant absoluto
- La empresa outsourcing (Fusion I.T.) siempre tiene control total

### Tabla nueva: tenant_user_permissions
```
id, user_id, tenant_id, permissions (JSON), created_at
```

### Permisos por rol
- superadmin  → todo
- admin       → todo menos manage_tenants
- technician  → view+manage tickets de empresas asignadas, view_inventory, view_reports
- supervisor  → solo view_tickets y view_reports de su empresa + puede comentar en tickets y generar alertas al equipo tecnico (SIN cambiar estado, asignar ni gestionar)
- client      → solo crea y consulta sus propios tickets

### Pendiente implementar
- [ ] Tabla tenant_user_permissions en models.py
- [ ] Migracion BD
- [ ] Middleware verificacion permisos por tenant
- [ ] UI panel asignacion de empresas a tecnicos
- [ ] Vista supervisor — solo lectura
