import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('pcf_requests')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('from_node_id', 'integer', (col) =>
      col.notNull().references('nodes.id').onDelete('cascade')
    )
    .addColumn('target_node_id', 'integer', (col) =>
      col.notNull().references('nodes.id').onDelete('cascade')
    )
    .addColumn('connection_id', 'integer', (col) =>
      col.notNull().references('connections.id').onDelete('cascade')
    )
    .addColumn('request_event_id', 'uuid', (col) => col.notNull().unique())
    .addColumn('filters', 'jsonb', (col) => col.notNull())
    .addColumn('status', 'varchar(20)', (col) =>
      col.notNull().defaultTo('pending')
    )
    .addColumn('result_count', 'integer')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('pcf_requests_from_node_id_idx')
    .on('pcf_requests')
    .column('from_node_id')
    .execute();

  await db.schema
    .createIndex('pcf_requests_request_event_id_idx')
    .on('pcf_requests')
    .column('request_event_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('pcf_requests').execute();
}
