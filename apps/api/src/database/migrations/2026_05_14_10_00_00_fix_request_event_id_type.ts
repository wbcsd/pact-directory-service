import { Kysely, sql } from 'kysely';

// CloudEvents spec requires source+id to be unique; id is any non-empty string (not necessarily a uuid).
// See: https://github.com/wbcsd/pact-directory-service/issues/292

export async function up(db: Kysely<unknown>): Promise<void> {
  // Change request_event_id from uuid to text
  await sql`ALTER TABLE pcf_requests ALTER COLUMN request_event_id TYPE text USING request_event_id::text`.execute(db);

  // Drop the single-column unique constraint (auto-named by postgres)
  await db.schema
    .alterTable('pcf_requests')
    .dropConstraint('pcf_requests_request_event_id_key')
    .execute();

  // Drop the now-redundant explicit index
  await db.schema.dropIndex('pcf_requests_request_event_id_idx').execute();

  // Add composite unique constraint aligning with the CloudEvents spec (source+id uniqueness)
  await db.schema
    .alterTable('pcf_requests')
    .addUniqueConstraint('pcf_requests_source_request_event_id_key', ['source', 'request_event_id'])
    .execute();

  // Backfill any existing rows that have a NULL source before enforcing NOT NULL
  await sql`UPDATE pcf_requests SET source = 'unknown' WHERE source IS NULL`.execute(db);

  // Make source non-nullable — every request must carry the CloudEvent source
  await sql`ALTER TABLE pcf_requests ALTER COLUMN source SET NOT NULL`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Revert source to nullable
  await sql`ALTER TABLE pcf_requests ALTER COLUMN source DROP NOT NULL`.execute(db);

  // Drop composite unique constraint
  await db.schema
    .alterTable('pcf_requests')
    .dropConstraint('pcf_requests_source_request_event_id_key')
    .execute();

  // Restore single-column unique constraint and index
  await db.schema
    .alterTable('pcf_requests')
    .addUniqueConstraint('pcf_requests_request_event_id_key', ['request_event_id'])
    .execute();

  await db.schema
    .createIndex('pcf_requests_request_event_id_idx')
    .on('pcf_requests')
    .column('request_event_id')
    .execute();

  // Change request_event_id back to uuid
  await sql`ALTER TABLE pcf_requests ALTER COLUMN request_event_id TYPE uuid USING request_event_id::uuid`.execute(db);
}
