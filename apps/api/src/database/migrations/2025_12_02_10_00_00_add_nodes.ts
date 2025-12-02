import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create nodes table
  await db.schema
    .createTable('nodes')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('organization_id', 'integer', (c) =>
      c.references('organizations.id').onDelete('cascade').notNull()
    )
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('type', 'text', (c) => c.notNull()) // 'internal' | 'external'
    .addColumn('api_url', 'text', (c) => c.notNull())
    .addColumn('status', 'text', (c) => c.notNull().defaultTo('active')) // 'active' | 'inactive' | 'pending'
    .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo('now()'))
    .addColumn('updated_at', 'timestamp', (c) => c.notNull().defaultTo('now()'))
    .execute();

  // Add indexes for nodes table
  await db.schema
    .createIndex('idx_nodes_organization_id')
    .on('nodes')
    .column('organization_id')
    .execute();

  await db.schema
    .createIndex('idx_nodes_type')
    .on('nodes')
    .column('type')
    .execute();

  await db.schema
    .createIndex('idx_nodes_status')
    .on('nodes')
    .column('status')
    .execute();

  // Drop existing connection tables
  await db.schema.dropTable('connections').execute();
  await db.schema.dropTable('connection_requests').execute();

  // Create new connections table with node references and credentials
  await db.schema
    .createTable('connections')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('from_node_id', 'integer', (c) =>
      c.references('nodes.id').onDelete('cascade').notNull()
    )
    .addColumn('target_node_id', 'integer', (c) =>
      c.references('nodes.id').onDelete('cascade').notNull()
    )
    .addColumn('client_id', 'text', (c) => c.notNull())
    .addColumn('client_secret', 'text', (c) => c.notNull()) // Will be encrypted
    .addColumn('status', 'text', (c) => c.notNull().defaultTo('pending')) // 'pending' | 'accepted' | 'rejected'
    .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo('now()'))
    .addColumn('updated_at', 'timestamp', (c) => c.notNull().defaultTo('now()'))
    .addColumn('expires_at', 'timestamp', (c) => c)
    .execute();

  // Add indexes for connections table
  await db.schema
    .createIndex('idx_connections_from_node_id')
    .on('connections')
    .column('from_node_id')
    .execute();

  await db.schema
    .createIndex('idx_connections_target_node_id')
    .on('connections')
    .column('target_node_id')
    .execute();

  await db.schema
    .createIndex('idx_connections_status')
    .on('connections')
    .column('status')
    .execute();

  // Add unique constraint to prevent duplicate connections
  await db.schema
    .createIndex('idx_connections_unique_pair')
    .on('connections')
    .columns(['from_node_id', 'target_node_id'])
    .unique()
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the new connections table
  await db.schema.dropTable('connections').execute();

  // Recreate the old connection tables
  await db.schema
    .createTable('connection_requests')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('requesting_company_id', 'integer', (c) =>
      c.references('organizations.id').notNull()
    )
    .addColumn('requested_company_id', 'integer', (c) =>
      c.references('organizations.id').notNull()
    )
    .addColumn('status', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamp', (c) => c.notNull())
    .addColumn('updated_at', 'timestamp', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('connections')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('connected_company_one_id', 'integer', (c) =>
      c.references('organizations.id').notNull()
    )
    .addColumn('connected_company_two_id', 'integer', (c) =>
      c.references('organizations.id').notNull()
    )
    .addColumn('created_at', 'timestamp', (c) => c.notNull())
    .addColumn('requested_at', 'timestamp', (c) => c.notNull())
    .execute();

  // Drop nodes table
  await db.schema.dropTable('nodes').execute();
}
