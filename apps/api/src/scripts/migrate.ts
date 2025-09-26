import * as path from "path";
import { Pool } from "pg";
import { promises as fs } from "fs";
import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
} from "kysely";
import config from "@src/common/config";
import { Database } from "@src/database/types";

async function main(command: string) {

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: config.DB_CONNECTION_STRING,
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
        migrationFolder: path.join(__dirname, "../database/migrations"),
      }),
    });

    let result;
    switch (command) {
      case "list":
        console.table(await migrator.getMigrations());
        return; // Exit without error
      case "latest":
        result = await migrator.migrateToLatest();
        break;
      case "down":
        result = await migrator.migrateDown();
        break;
      case "up":
        result = await migrator.migrateUp();
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
    console.table(result.results);
    if (result.error) {
      console.error("Failed to migrate", result.error);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Unexpected error during migration", error);
    process.exitCode = 1;
  } finally {
    // Ensure the database connection is always closed.
    await db.destroy();
  }
}

main(process.argv[2]).catch((error: unknown) => {
  console.error("Fatal error during migration process:", error);
  process.exitCode = 1;
});
