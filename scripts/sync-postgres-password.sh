#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 \
  -v db_user="$POSTGRES_USER" \
  -v db_password="$POSTGRES_PASSWORD" <<'SQL'
ALTER USER :"db_user" WITH PASSWORD :'db_password';
SELECT 'password updated for ' || :'db_user' AS status;
SQL
