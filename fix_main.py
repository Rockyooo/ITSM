path = r'C:\Users\🃏\ITSM\backend\app\main.py'
content = open(path, encoding='utf-8').read()

# Agregar INSERT de tenant-001 antes del INSERT del admin
old = """            try:
                from app.routers.auth import hash_password
                new_hash = hash_password("Admin123!")
                conn.execute(text(f\"\"\"
                    INSERT INTO users (id, email, full_name, role, is_active, hashed_password, tenant_id)
                    VALUES ('usr-superadmin', 'admin@fusion-it.co', 'Administrador Maestro', 'superadmin', true, '{new_hash}', 'tenant-001')
                    ON CONFLICT (email) DO NOTHING

                \"\"\"))
                conn.commit()
            except: pass"""

new = """            try:
                conn.execute(text(\"\"\"
                    INSERT INTO tenants (id, name, slug, domain, is_active, created_at)
                    VALUES ('tenant-001', 'Fusion IT', 'fusion-it', 'fusion-it.co', true, NOW())
                    ON CONFLICT (id) DO NOTHING
                \"\"\"))
                conn.commit()
            except: pass
            try:
                from app.routers.auth import hash_password
                new_hash = hash_password("FusionIT2024!")
                conn.execute(text(f\"\"\"
                    INSERT INTO users (id, email, full_name, role, is_active, hashed_password, tenant_id)
                    VALUES ('usr-superadmin-001', 'admin@fusion-it.co', 'Admin Fusion IT', 'superadmin', true, '{new_hash}', 'tenant-001')
                    ON CONFLICT (email) DO NOTHING
                \"\"\"))
                conn.commit()
            except: pass"""

content = content.replace(old, new, 1)
open(path, 'w', encoding='utf-8').write(content)
print('OK - tenant-001 + admin con FusionIT2024! corregidos')
