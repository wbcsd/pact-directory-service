import * as path from "path";
import { Pool } from "pg";
import { promises as fs } from "fs";
import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
} from "kysely";
import { Database } from "./types";
import EnvVars from "../common/EnvVars";

async function migrateToLatest() {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        database: EnvVars.DirectoryDatabase.Database,
        host: EnvVars.DirectoryDatabase.Host,
        user: EnvVars.DirectoryDatabase.User,
        password: EnvVars.DirectoryDatabase.Password,
        port: 5432,
        max: 10,
      }),
    }),
  });

  try {
    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        // This needs to be an absolute path.
        migrationFolder: path.join(__dirname, "migrations"),
      }),
    });

    const { error, results } = await migrator.migrateToLatest();

    results?.forEach((it) => {
      if (it.status === "Success") {
        console.log(`migration "${it.migrationName}" was executed successfully`);
      } else if (it.status === "Error") {
        console.error(`failed to execute migration "${it.migrationName}"`);
      }
    });

    if (error) {
      console.error("failed to migrate");
      console.error(error);
      process.exitCode = 1;
    }
  } catch (error: unknown) {
    console.error("Unexpected error during migration:", error);
    process.exitCode = 1;
  } finally {
    // Ensure the database connection is always closed.
    await db.destroy()
  }
}

migrateToLatest().catch((error: unknown) => {
  console.error("Fatal error during migration process:", error);
  process.exitCode = 1;
});
