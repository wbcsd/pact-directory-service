import { Kysely, sql } from 'kysely';

/**
 * Add a unique index on (node_id, data->>'id') for product_footprints.
 *
 * This enables idempotent upserts when a node receives PCFs via a
 * RequestFulfilledEvent — the same PACT footprint (identified by data.id)
 * should not be duplicated within the same node's records.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE UNIQUE INDEX product_footprints_node_pact_id_key
    ON product_footprints (node_id, (data->>'id'))
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS product_footprints_node_pact_id_key
  `.execute(db);
}
