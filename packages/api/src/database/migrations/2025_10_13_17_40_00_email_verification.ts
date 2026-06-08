// apps/api/src/database/migrations/2025_01_14_10_00_00_user_email_verification.ts
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add status and email verification fields to users table
  await db.schema
    .alterTable('users')
    .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('unverified'))
    .addColumn('email_verification_token', 'varchar(255)')
    .addColumn('email_verification_sent_at', 'timestamp')
    .execute();

  // Create index for verification token lookups
  await db.schema
    .createIndex('idx_users_email_verification_token')
    .on('users')
    .column('email_verification_token')
    .execute();

  // Update existing users to 'enabled' status (they're already active)
  await db
    .updateTable('users')
    .set({ 
      status: 'enabled'
    })
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropIndex('idx_users_email_verification_token')
    .execute();
    
  await db.schema
    .alterTable('users')
    .dropColumn('status')
    .dropColumn('email_verification_token')
    .dropColumn('email_verification_sent_at')
    .execute();
}