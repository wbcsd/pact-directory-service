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
import logger from "../util/logger";

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
      switch (it.status) {
        case "Success":
          logger.info(
            `Migration "${it.migrationName}" was executed successfully.`
          );
          break;
        case "Error":
          logger.error(`Migration "${it.migrationName}" failed to execute.`);
          break;
        case "NotExecuted":
          console.warn(
            `Migration "${it.migrationName}" was not executed due to earlier failures.`
          );
          break;
        default:
          // Type safety - handle potential future statuses
          logger.info(
            `Migration "${it.migrationName}" has status: ${it.status as string}`
          );
      }
    });

    if (error) {
      logger.error("failed to migrate");
      logger.error(error);
      process.exitCode = 1;
    }
  } catch (error: unknown) {
    logger.error("Unexpected error during migration:", error as any);
    process.exitCode = 1;
  } finally {
    // Ensure the database connection is always closed.
    await db.destroy();
  }
}

migrateToLatest().catch((error: unknown) => {
  logger.error("Fatal error during migration process:", error as any);
  process.exitCode = 1;
});
