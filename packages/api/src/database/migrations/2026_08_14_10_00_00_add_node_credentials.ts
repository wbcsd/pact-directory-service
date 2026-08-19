import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('nodes')
    .addColumn('client_id', 'text')
    .execute();

  await db.schema
    .alterTable('nodes')
    .addColumn('client_secret', 'text')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('nodes').dropColumn('client_id').execute();
  await db.schema.alterTable('nodes').dropColumn('client_secret').execute();
}
