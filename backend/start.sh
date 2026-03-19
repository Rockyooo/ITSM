#!/bin/bash
set -euo pipefail

echo '=== ITSM Fusion I.T. — Backend Startup ==='

echo '[1/4] Esperando PostgreSQL...'
until pg_isready -h  -p  -U  -q; do
  echo '  PostgreSQL no listo, esperando 2s...'
  sleep 2
done
echo '[1/4] PostgreSQL listo.'

echo '[2/4] Aplicando migraciones...'
alembic upgrade head
echo '[2/4] Migraciones aplicadas.'

echo '[3/4] Seed inicial...'
if [ "\" = 'true' ]; then
  python -m app.seed
fi
echo '[3/4] Seed completado.'

echo '[4/4] Iniciando Uvicorn...'
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port \ \
  --workers \ \
  --log-level info
