main_path = r'C:\Users\🃏\ITSM\backend\app\main.py'
content = open(main_path, encoding='utf-8').read()

migration = """            try:
                conn.execute(text(
                    "CREATE TABLE IF NOT EXISTS tenant_sedes ("
                    "id VARCHAR PRIMARY KEY, tenant_id VARCHAR NOT NULL REFERENCES tenants(id),"
                    "name VARCHAR(200) NOT NULL, city VARCHAR(100) NOT NULL,"
                    "address VARCHAR(300), phone VARCHAR(50),"
                    "is_main BOOLEAN DEFAULT FALSE, is_active BOOLEAN DEFAULT TRUE,"
                    "created_at TIMESTAMP DEFAULT NOW())"
                ))
                conn.commit()
            except: pass
"""

old = "    except Exception as e:\n        print(f'[WARNING] Migraciones fallaron: {e}')"
new = migration + old
content = content.replace(old, new, 1)

open(main_path, 'w', encoding='utf-8').write(content)
print('OK - migracion sedes agregada')
print('Lineas:', content.count('\n'))
