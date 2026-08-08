import pg from "pg";
import { config } from "../config.js";

export interface PostgresBoundaryStatus {
  configured: boolean;
  ready: boolean;
  migrationVersion: number | null;
  error: string | null;
}

let status: PostgresBoundaryStatus = {
  configured: config.databaseProvider === "postgresql",
  ready: false,
  migrationVersion: null,
  error: config.databaseProvider === "postgresql" && !config.databaseUrl ? "PROPERTY_SUITE_DATABASE_URL is required for PostgreSQL" : null,
};

export function getPostgresBoundaryStatus(): PostgresBoundaryStatus {
  return status;
}

export async function verifyPostgresBoundary(): Promise<PostgresBoundaryStatus> {
  if (config.databaseProvider !== "postgresql") {
    status = { configured: false, ready: false, migrationVersion: null, error: null };
    return status;
  }
  if (!config.databaseUrl) {
    status = { configured: true, ready: false, migrationVersion: null, error: "PROPERTY_SUITE_DATABASE_URL is required for PostgreSQL" };
    return status;
  }
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  try {
    await pool.query("SELECT 1");
    const versionResult = await pool.query("SELECT to_regclass('public.schema_migrations') AS table_name");
    if (!versionResult.rows[0]?.table_name) {
      status = { configured: true, ready: false, migrationVersion: null, error: "PostgreSQL schema is not initialized. Run scripts/postgres-init.sql first." };
      return status;
    }
    const migration = await pool.query("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations");
    status = {
      configured: true,
      ready: true,
      migrationVersion: Number(migration.rows[0]?.version ?? 0),
      error: null,
    };
    return status;
  } catch (error) {
    status = {
      configured: true,
      ready: false,
      migrationVersion: null,
      error: error instanceof Error ? error.message : "PostgreSQL connection failed",
    };
    return status;
  } finally {
    await pool.end();
  }
}
