import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add source column — callback base URL for incoming requests (event.source)
  await db.schema
    .alterTable('pcf_requests')
    .addColumn('source', 'text')
    .execute();

  // Add fulfilled_footprint_ids — IDs included in RequestFulfilledEvent
  await db.schema
    .alterTable('pcf_requests')
    .addColumn('fulfilled_footprint_ids', 'jsonb')
    .execute();

  // Make connection_id nullable — incoming requests may not map to a tracked connection
  await sql`ALTER TABLE pcf_requests ALTER COLUMN connection_id DROP NOT NULL`.execute(db);

  // Make from_node_id nullable — incoming requests from external nodes may not have a node record
  await sql`ALTER TABLE pcf_requests ALTER COLUMN from_node_id DROP NOT NULL`.execute(db);

  // Drop the FK constraint on from_node_id so NULL values are valid
  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'pcf_requests'
          AND constraint_name = 'pcf_requests_from_node_id_fkey'
      ) THEN
        ALTER TABLE pcf_requests DROP CONSTRAINT pcf_requests_from_node_id_fkey;
      END IF;
    END
    $$
  `.execute(db);

  // Index on target_node_id for inbox queries
  await db.schema
    .createIndex('pcf_requests_target_node_id_idx')
    .on('pcf_requests')
    .column('target_node_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex('pcf_requests_target_node_id_idx').execute();
  await db.schema.alterTable('pcf_requests').dropColumn('fulfilled_footprint_ids').execute();
  await db.schema.alterTable('pcf_requests').dropColumn('source').execute();
}
