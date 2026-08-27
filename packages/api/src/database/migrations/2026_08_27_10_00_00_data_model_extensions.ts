import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Central registry of known PACT data model extensions.
  // See https://wbcsd.github.io/data-model-extensions/spec/
  await db.schema
    .createTable('data_model_extensions')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('name', 'text', (c) => c.notNull())
    // Business key: URL of the publicly accessible JSON Schema file (spec § 4.3)
    .addColumn('data_schema_url', 'text', (c) => c.notNull().unique())
    .addColumn('documentation_url', 'text')
    // Version of the Data Model Extension specification the entry conforms to
    .addColumn('spec_version', 'text', (c) => c.notNull().defaultTo('2.0.0'))
    // Semantic version of the extension itself
    .addColumn('version', 'text')
    .addColumn('description', 'text')
    .addColumn('author', 'text')
    .addColumn('contact_email', 'text')
    .addColumn('status', 'text', (c) => c.notNull().defaultTo('active'))
    // Cached copy of the fetched JSON Schema document
    .addColumn('schema_json', 'jsonb')
    .addColumn('schema_fetched_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (c) =>
      c.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamp', (c) =>
      c.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_data_model_extensions_status')
    .on('data_model_extensions')
    .column('status')
    .execute();

  await db.schema
    .createTable('node_data_model_extensions')
    .addColumn('node_id', 'integer', (c) =>
      c.references('nodes.id').onDelete('cascade').notNull()
    )
    .addColumn('extension_id', 'integer', (c) =>
      c.references('data_model_extensions.id').onDelete('cascade').notNull()
    )
    .addColumn('created_at', 'timestamp', (c) =>
      c.notNull().defaultTo(sql`now()`)
    )
    .addPrimaryKeyConstraint('pk_node_data_model_extensions', [
      'node_id',
      'extension_id',
    ])
    .execute();

  await db.schema
    .createIndex('idx_node_data_model_extensions_extension_id')
    .on('node_data_model_extensions')
    .column('extension_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('node_data_model_extensions').execute();
  await db.schema.dropTable('data_model_extensions').execute();
}
