#!/usr/bin/env bash
set -euo pipefail

# ====== Config ======
# ปรับค่าได้ด้วย env ด้านนอก หรือแก้ตรงนี้
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-chamarodfai}"
PGUSER_SUPER="${PGUSER_SUPER:-postgres}"      # ผู้ใช้ที่มีสิทธิ์ CREATE EXTENSION
PGPASS_SUPER="${PGPASS_SUPER:-chamarodfai101}"      # รหัสของ superuser
PGUSER_APP="${PGUSER_APP:-postgres}"          # ผู้ใช้แอป (สิทธิ์บน DB/Schema pos)
PGPASS_APP="${PGPASS_APP:-chamarodfai101}"

SQL_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/apply.sql"

echo "== Apply POS schema to database: $PGDATABASE on $PGHOST:$PGPORT =="

# --- Step 0: ensure database exists (ใช้ superuser เช็คและสร้าง) ---
export PGPASSWORD="$PGPASS_SUPER"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER_SUPER" -d postgres -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$PGDATABASE') THEN
      PERFORM dblink_connect('dbname=postgres');
      EXECUTE format('CREATE DATABASE %I', '$PGDATABASE');
   END IF;
END
\$\$;
SQL

# --- Step 1: run extensions (ต้องใช้ superuser) ---
echo "-- Step 1/2: CREATE EXTENSION (superuser) --"
export PGPASSWORD="$PGPASS_SUPER"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER_SUPER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
SQL

# --- Step 2: run the rest of schema with app user ---
echo "-- Step 2/2: Apply schema as app user --"
export PGPASSWORD="$PGPASS_APP"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER_APP" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo "✅ Done."
