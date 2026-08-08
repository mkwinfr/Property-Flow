CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PostgreSQL hosted deployments should import data with:
--   node scripts/export-sqlite-bundle.mjs
--   psql "$PROPERTY_SUITE_DATABASE_URL" -f scripts/postgres-init.sql
--   node scripts/import-postgres-bundle.mjs
