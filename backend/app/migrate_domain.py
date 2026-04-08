"""
Script de migracion puntual — ejecutar una sola vez.
Agrega columna domain a tenants y configura tenant-001.
"""
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Agregar columna domain si no existe
    try:
        conn.execute(text("ALTER TABLE tenants ADD COLUMN domain VARCHAR(100) UNIQUE"))
        conn.commit()
        print("Columna domain agregada")
    except Exception as e:
        print(f"Columna ya existe o error: {e}")
        conn.rollback()

    # Actualizar tenant-001 con dominio fusion-it.co
    conn.execute(text("UPDATE tenants SET domain = 'fusion-it.co' WHERE id = 'tenant-001'"))
    conn.commit()
    print("tenant-001 ? fusion-it.co OK")

    # Crear tenant de prueba para fusion-prueba.co
    try:
        conn.execute(text("""
            INSERT INTO tenants (id, name, slug, domain, is_active, created_at)
            VALUES ('tenant-prueba', 'Empresa Prueba', 'empresa-prueba', 'fusion-prueba.co', true, NOW())
        """))
        conn.commit()
        print("tenant-prueba ? fusion-prueba.co OK")
    except Exception as e:
        print(f"Tenant prueba ya existe: {e}")
        conn.rollback()

    print("Migracion completada")
