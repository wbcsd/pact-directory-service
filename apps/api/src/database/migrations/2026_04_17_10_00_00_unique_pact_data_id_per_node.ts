import { Kysely, sql } from 'kysely';

/**
 * Align product_footprints.id with the PACT footprint ID (data->>'id').
 * After this migration the composite PK (id, node_id) is the natural key.
 *
 * Steps:
 *  1. Backfill: set id = data->>'id' for every existing row.
 *  2. Drop the auto-generated default (gen_random_uuid()).
 *  3. Change the PK from (id) → (id, node_id), so the same PACT
 *     footprint may exist on multiple nodes.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. Backfill id from data->>'id'
  await sql`
    UPDATE product_footprints SET id = (data->>'id')::uuid
    WHERE id != (data->>'id')::uuid
  `.execute(db);

  // 2. Remove the auto-generated default
  await db.schema
    .alterTable('product_footprints')
    .alterColumn('id', (ac) => ac.dropDefault())
    .execute();

  // 3. Replace single-column PK with composite PK (id, node_id)
  await db.schema
    .alterTable('product_footprints')
    .dropConstraint('product_footprints_pkey')
    .execute();

  await db.schema
    .alterTable('product_footprints')
    .addPrimaryKeyConstraint('product_footprints_pkey', ['id', 'node_id'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('product_footprints')
    .dropConstraint('product_footprints_pkey')
    .execute();

  await db.schema
    .alterTable('product_footprints')
    .addPrimaryKeyConstraint('product_footprints_pkey', ['id'])
    .execute();

  await db.schema
    .alterTable('product_footprints')
    .alterColumn('id', (ac) => ac.setDefault(sql`gen_random_uuid()`))
    .execute();
}
