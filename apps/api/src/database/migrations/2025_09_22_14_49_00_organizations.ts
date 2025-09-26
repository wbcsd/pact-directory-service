import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Remove existing users and companies tables
  await db.schema.dropTable('connections').ifExists().execute();
  await db.schema.dropTable('connection_requests').ifExists().execute();
  await db.schema.dropTable('companies').ifExists().execute();
  await db.schema.dropTable('users').ifExists().execute();

  // Create organizations table if not exists
  await db.schema
    .createTable('organizations')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('org_identifier', 'text', (c) => c.notNull())
    .addColumn('org_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('solution_api_url', 'text', (c) => c.notNull())
    .addColumn('client_id', 'text')
    .addColumn('client_secret', 'text')
    .addColumn('network_key', 'text')
    .addColumn('org_identifier_description', 'text')
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await db.schema
    .createTable('connection_requests')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('requesting_organization_id', 'integer', (c) =>
      c.references('organization.id').notNull()
    )
    .addColumn('requested_organization_id', 'integer', (c) =>
      c.references('organization.id').notNull()
    )
    .addColumn('status', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('updated_at', 'timestamp', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('connections')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('connected_organization_one_id', 'integer', (c) =>
      c.references('organizations.id').notNull()
    )
    .addColumn('connected_organization_two_id', 'integer', (c) =>
      c.references('organizations.id').notNull()
    )
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('requested_at', 'timestamp', (c) => c.notNull())
    .execute();

  // Create users table if not exists
  await db.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('user_id', 'serial', (col) => col.primaryKey())
    .addColumn('org_id', 'integer', (col) =>
      col.notNull().references('organizations.id')
    )
    .addColumn('password', 'varchar(255)', (col) => col.notNull())
    .addColumn('user_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('user_email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('role_id', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // Create roles table if not exists
  await db.schema
    .createTable('roles')
    .ifNotExists()
    .addColumn('role_id', 'serial', (col) => col.primaryKey())
    .addColumn('role_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await db.schema
    .createTable('policies')
    .ifNotExists()
    .addColumn('policy_id', 'serial', (col) => col.primaryKey())
    .addColumn('resource_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('resource_action', 'varchar(255)', (col) => col.notNull())
    .addColumn('policy_description', 'text')
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await db.schema
    .createTable('roles_policies')
    .ifNotExists()
    .addColumn('role_policy_id', 'serial', (col) => col.primaryKey())
    .addColumn('role_id', 'integer', (col) => col.notNull())
    .addColumn('policy_id', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('roles_policies').ifExists().execute();
  await db.schema.dropTable('policies').ifExists().execute();
  await db.schema.dropTable('roles').ifExists().execute();
  await db.schema.dropTable('users').ifExists().execute();
  await db.schema.dropTable('organizations').ifExists().execute();
  await db.schema.dropTable('connections').ifExists().execute();
  await db.schema.dropTable('connection_requests').ifExists().execute();
}
