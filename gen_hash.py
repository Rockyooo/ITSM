import bcrypt
pwd = "FusionIT2024!"
h = bcrypt.hashpw(pwd.encode(), bcrypt.gensalt(12)).decode()
print("Ejecuta este SQL en Railway Postgres -> Query:")
print()
print(f"""-- 1. Insertar tenant si no existe
INSERT INTO tenants (id, name, slug, domain, is_active, created_at)
VALUES ('tenant-001', 'Fusion IT', 'fusion-it', 'fusion-it.co', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar o actualizar admin
INSERT INTO users (id, email, full_name, role, is_active, hashed_password, tenant_id)
VALUES ('usr-superadmin-001', 'admin@fusion-it.co', 'Admin Fusion IT', 'superadmin', true, '{h}', 'tenant-001')
ON CONFLICT (email) DO UPDATE SET hashed_password = '{h}', is_active = true;""")
