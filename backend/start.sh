#!/bin/sh
echo "Creando tablas..."
python -c "
from app.database import engine
from app.models import Base
Base.metadata.create_all(bind=engine)
print('Tablas creadas OK')
"
echo "Iniciando servidor..."
uvicorn app.main:app --host 0.0.0.0 --port 8000
