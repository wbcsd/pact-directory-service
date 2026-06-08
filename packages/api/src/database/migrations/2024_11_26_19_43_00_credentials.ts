import { Kysely } from 'kysely';
import { Database } from '../types';

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable('companies')
    .addColumn('client_id', 'text')
    .addColumn('client_secret', 'text')
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable('companies')
    .dropColumn('client_id')
    .dropColumn('client_secret')
    .execute();
}
