import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  PGHOST = "localhost",
  PGPORT = "5432",
  PGDATABASE = "chamarodfai",
  PGUSER_SUPER = "postgres",
  PGPASS_SUPER = "chamarodfai101",
  PGUSER_APP = "postgres",
  PGPASS_APP = "chamarodfai101",
} = process.env;

const sqlPath = path.join(__dirname, "init.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const conn = (u, p, db) =>
  `postgres://${encodeURIComponent(u)}:${encodeURIComponent(p)}@${PGHOST}:${PGPORT}/${db}`;

async function ensureDb() {
  const client = new pg.Client({ connectionString: conn(PGUSER_SUPER, PGPASS_SUPER, "postgres") });
  await client.connect();
  try {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${PGDATABASE}') THEN
          EXECUTE format('CREATE DATABASE %I', '${PGDATABASE}');
        END IF;
      END
      $$;
    `);
  } finally {
    await client.end();
  }
}

async function ensureExtensions() {
  const client = new pg.Client({ connectionString: conn(PGUSER_SUPER, PGPASS_SUPER, PGDATABASE) });
  await client.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS citext;`);
  } finally {
    await client.end();
  }
}

async function applySchema() {
  const client = new pg.Client({ connectionString: conn(PGUSER_APP, PGPASS_APP, PGDATABASE) });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("✅ Schema applied.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Apply failed:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

(async () => {
  await ensureDb();
  await ensureExtensions();
  await applySchema();
})();
