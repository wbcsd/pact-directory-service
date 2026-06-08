import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add status column to organizations table with default 'active'
  await db.schema
    .alterTable('organizations')
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove status column from organizations table
  await db.schema.alterTable('organizations').dropColumn('status').execute();
}
