// register last_login column in users table
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add last_login column to users table
  await db.schema
    .alterTable('users')
    .addColumn('last_login', 'timestamp')
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function down(db: Kysely<any>): Promise<void> {
  // Remove last_login column from users table
  await db.schema.alterTable('users').dropColumn('last_login').execute();
} 