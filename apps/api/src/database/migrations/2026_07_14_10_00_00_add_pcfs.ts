import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Enable uuid-ossp extension if not already enabled
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.execute(db);

  // Create pcfs table
  await db.schema
    .createTable('pcfs')
    .addColumn('id', 'uuid', (c) =>
      c.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn('node_id', 'integer', (c) =>
      c.references('nodes.id').onDelete('cascade').notNull()
    )
    .addColumn('pcf', 'jsonb', (c) => c.notNull())
    .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // Add index on node_id for efficient lookups
  await db.schema
    .createIndex('idx_pcfs_node_id')
    .on('pcfs')
    .column('node_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('pcfs').execute();
}
