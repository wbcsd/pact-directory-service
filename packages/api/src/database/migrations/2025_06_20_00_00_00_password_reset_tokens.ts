import { Kysely } from 'kysely';
import { Database } from '../types';

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('password_reset_tokens')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('user_id', 'integer', (c) =>
      c.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('token', 'text', (c) => c.notNull().unique())
    .addColumn('expires_at', 'timestamp', (c) => c.notNull())
    .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo('now()'))
    .addColumn('used_at', 'timestamp', (c) => c)
    .execute();

  // Create index for fast token lookups
  await db.schema
    .createIndex('password_reset_tokens_token_idx')
    .on('password_reset_tokens')
    .column('token')
    .execute();

  // Create index for cleanup of expired tokens
  await db.schema
    .createIndex('password_reset_tokens_expires_at_idx')
    .on('password_reset_tokens')
    .column('expires_at')
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable('password_reset_tokens').execute();
}
