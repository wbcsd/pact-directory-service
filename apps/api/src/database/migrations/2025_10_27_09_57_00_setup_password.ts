import { Kysely, sql } from 'kysely';

/**
 * Migration: Create password_setup_tokens table
 * 
 * This table stores tokens used when admins create new users who need to set
 * their own passwords. Implements a state machine with three states:
 * - generated: Initial state when token is created
 * - used: Token has been used to set a password
 * - expired: Token has passed its expiration time
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('password_setup_tokens')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('userId', 'integer', (col) =>
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('token', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('status', 'varchar(20)', (col) => 
      col.notNull().defaultTo('generated')
      // Valid values: 'generated', 'used', 'expired'
    )
    .addColumn('created_at', 'timestamp', (col) => 
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('expires_at', 'timestamp', (col) => col.notNull())
    .addColumn('used_at', 'timestamp')
    .execute();

  // Create index on token for faster lookups
  await db.schema
    .createIndex('password_setup_tokens_token_idx')
    .on('password_setup_tokens')
    .column('token')
    .execute();

  // Create index on userId for cleanup queries
  await db.schema
    .createIndex('password_setup_tokens_user_id_idx')
    .on('password_setup_tokens')
    .column('user_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('password_setup_tokens').execute();
}
