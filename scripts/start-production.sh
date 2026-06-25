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

PRISMA="node node_modules/prisma/build/index.js"

run_migrations() {
  if $PRISMA migrate deploy; then
    return 0
  fi

  # Deploy fehlgeschlagen. Haeufigste Ursache nach einem zuvor abgebrochenen
  # Deploy: eine als "failed" markierte Migration (Fehlercode P3009). Da Prisma
  # jede Migration in einer Transaktion ausfuehrt, wurde eine fehlgeschlagene
  # Migration vollstaendig zurueckgerollt - sie kann daher sicher als
  # "rolled-back" markiert und erneut angewendet werden.
  failed="$(node scripts/list-failed-migrations.mjs || true)"
  if [ -z "$failed" ]; then
    echo "[start] FEHLER: Migrationen fehlgeschlagen und keine als 'failed' markierte Migration gefunden. Abbruch." >&2
    return 1
  fi

  echo "[start] WARNUNG: Fehlgeschlagene Migration(en) erkannt. Versuche automatische Wiederherstellung (resolve --rolled-back)..." >&2
  for migration in $failed; do
    echo "[start] -> Markiere '$migration' als rolled-back." >&2
    $PRISMA migrate resolve --rolled-back "$migration"
  done

  echo "[start] Wende Migrationen nach Wiederherstellung erneut an..."
  $PRISMA migrate deploy
}

if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
  echo "[start] Datenbank-Migrationen werden angewendet (prisma migrate deploy)..."
  run_migrations
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
