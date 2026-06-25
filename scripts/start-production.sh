#!/bin/sh
set -eu

POSTGRES_USER="${POSTGRES_USER:-fleetbase}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env.production}"
POSTGRES_DB="${POSTGRES_DB:-fleetbase}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_SCHEMA="${POSTGRES_SCHEMA:-public}"

if [ "${DATABASE_URL_OVERRIDE:-false}" != "true" ]; then
  DATABASE_URL="$(node - "$POSTGRES_USER" "$POSTGRES_PASSWORD" "$POSTGRES_HOST" "$POSTGRES_PORT" "$POSTGRES_DB" "$POSTGRES_SCHEMA" <<'NODE'
const [user, password, host, port, database, schema] = process.argv.slice(2);
const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
const path = encodeURIComponent(database);
const params = new URLSearchParams({ schema });
process.stdout.write(`postgresql://${auth}@${host}:${port}/${path}?${params}`);
NODE
)"
  export DATABASE_URL
fi

if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
  echo "[start] Datenbank-Migrationen werden angewendet (prisma migrate deploy)..."
  node node_modules/prisma/build/index.js migrate deploy
  echo "[start] Migrationen erfolgreich angewendet."
fi

if [ "${BOOTSTRAP_SUPER_ADMIN:-true}" != "false" ]; then
  echo "[start] Super-Admin wird sichergestellt..."
  if node scripts/bootstrap-super-admin.mjs; then
    echo "[start] Super-Admin bereit."
  else
    echo "[start] WARNUNG: Super-Admin-Bootstrap fehlgeschlagen. Haeufigste Ursache: SUPER_ADMIN_PASSWORD fehlt oder ist zu schwach (mind. 16 Zeichen mit Gross-/Kleinbuchstabe, Zahl und Sonderzeichen). Die App startet trotzdem - bitte SUPER_ADMIN_PASSWORD in .env.production setzen und den Container neu starten." >&2
  fi
fi

echo "[start] Next.js-Server wird gestartet (Port ${PORT:-3000})..."
exec node server.js
