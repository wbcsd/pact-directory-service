import { Kysely, sql } from 'kysely';
import { Database } from '../types';

/**
 * Migration: Rename password_reset_tokens to password_tokens and add type column
 * 
 * Use this migration if you ALREADY have the password_reset_tokens table.
 * This will preserve your existing reset tokens and add the new functionality.
 */
export async function up(db: Kysely<Database>): Promise<void> {
  // Rename the table
  await sql`ALTER TABLE password_reset_tokens RENAME TO password_tokens`.execute(db);

  // Add type column (default to 'reset' for existing tokens)
  await db.schema
    .alterTable('password_tokens')
    .addColumn('type', 'text', (c) => c.notNull().defaultTo('reset'))
    .execute();

  // Create index for token type queries
  await db.schema
    .createIndex('password_tokens_type_idx')
    .on('password_tokens')
    .column('type')
    .execute();

  // Remove the default after creation (so new tokens must explicitly specify type)
  await sql`ALTER TABLE password_tokens ALTER COLUMN type DROP DEFAULT`.execute(db);
}

export async function down(db: Kysely<Database>): Promise<void> {
  // Drop the type column
  await db.schema
    .alterTable('password_tokens')
    .dropColumn('type')
    .execute();

  // Rename back to original name
  await sql`ALTER TABLE password_tokens RENAME TO password_reset_tokens`.execute(db);
}