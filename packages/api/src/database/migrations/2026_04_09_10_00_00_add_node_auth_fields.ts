import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('nodes')
    .addColumn('auth_base_url', 'text')
    .execute();

  await db.schema
    .alterTable('nodes')
    .addColumn('scope', 'text')
    .execute();

  await db.schema
    .alterTable('nodes')
    .addColumn('audience', 'text')
    .execute();

  await db.schema
    .alterTable('nodes')
    .addColumn('resource', 'text')
    .execute();

  await db.schema
    .alterTable('nodes')
    .addColumn('spec_version', 'text')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('nodes').dropColumn('auth_base_url').execute();
  await db.schema.alterTable('nodes').dropColumn('scope').execute();
  await db.schema.alterTable('nodes').dropColumn('audience').execute();
  await db.schema.alterTable('nodes').dropColumn('resource').execute();
  await db.schema.alterTable('nodes').dropColumn('spec_version').execute();
}
