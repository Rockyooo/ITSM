db_path = r'C:\Users\🃏\ITSM\backend\app\database.py'
content = open(db_path, encoding='utf-8').read()
old = 'engine = create_engine(DATABASE_URL, pool_pre_ping=True)'
new = '''engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
)'''
content = content.replace(old, new, 1)
open(db_path, 'w', encoding='utf-8').write(content)
print('OK:', open(db_path, encoding='utf-8').read())
