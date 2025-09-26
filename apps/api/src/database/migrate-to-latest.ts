import * as path from 'path';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
} from 'kysely';
import { Database } from './types';
import config from '../common/config';

async function migrateToLatest() {
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
        migrationFolder: path.join(__dirname, 'migrations'),
      }),
    });

    const { error, results } = await migrator.migrateToLatest();

    results?.forEach((it) => {
      switch (it.status) {
        case 'Success':
          console.info(
            `Migration "${it.migrationName}" was executed successfully.`
          );
          break;
        case 'Error':
          console.error(`Migration "${it.migrationName}" failed to execute.`);
          break;
        case 'NotExecuted':
          console.warn(
            `Migration "${it.migrationName}" was not executed due to earlier failures.`
          );
          break;
        default:
          // Type safety - handle potential future statuses
          console.info(
            `Migration "${it.migrationName}" has status: ${it.status as string}`
          );
      }
    });

    if (error) {
      console.error('Failed to migrate', error);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error during migration', error);
    process.exitCode = 1;
  } finally {
    // Ensure the database connection is always closed.
    await db.destroy();
  }
}

migrateToLatest().catch((error: unknown) => {
  console.error('Fatal error during migration process:', error);
  process.exitCode = 1;
});
