import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create activity_logs table for unified logging
  await db.schema
    .createTable('activity_logs')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('path', 'text', (c) => c.notNull()) // CloudWatch-style path: /pact/nodes/{uuid}, /pact/testing/{uuid}
    .addColumn('level', 'text', (c) => c.notNull()) // info, warn, error, debug
    .addColumn('message', 'text', (c) => c.notNull())
    .addColumn('content', 'jsonb', (c) => c.notNull()) // Structured log data
    .addColumn('node_id', 'integer', (c) => c.references('nodes.id').onDelete('set null'))
    .addColumn('organization_id', 'integer', (c) => c.references('organizations.id').onDelete('set null'))
    .addColumn('user_id', 'integer', (c) => c.references('users.id').onDelete('set null'))
    .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo('now()'))
    .execute();

  // Add indexes for efficient querying
  await db.schema
    .createIndex('idx_activity_logs_path')
    .on('activity_logs')
    .column('path')
    .execute();

  await db.schema
    .createIndex('idx_activity_logs_level')
    .on('activity_logs')
    .column('level')
    .execute();

  await db.schema
    .createIndex('idx_activity_logs_node_id')
    .on('activity_logs')
    .column('node_id')
    .execute();

  await db.schema
    .createIndex('idx_activity_logs_organization_id')
    .on('activity_logs')
    .column('organization_id')
    .execute();

  await db.schema
    .createIndex('idx_activity_logs_created_at')
    .on('activity_logs')
    .column('created_at')
    .execute();

  // Add GIN index for JSONB content for efficient JSON queries
  await db.schema
    .createIndex('idx_activity_logs_content')
    .on('activity_logs')
    .column('content')
    .using('gin')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('activity_logs').execute();
}
