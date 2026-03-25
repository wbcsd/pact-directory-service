import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create product_footprints table
  await db.schema
    .createTable('product_footprints')
    .addColumn('id', 'uuid', (c) =>
      c.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('node_id', 'integer', (c) =>
      c.references('nodes.id').onDelete('cascade').notNull()
    )
    .addColumn('data', 'jsonb', (c) => c.notNull())
    .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // Add index on node_id for efficient lookups
  await db.schema
    .createIndex('idx_product_footprints_node_id')
    .on('product_footprints')
    .column('node_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('product_footprints').execute();
}
