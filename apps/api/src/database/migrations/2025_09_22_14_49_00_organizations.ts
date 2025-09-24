import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Create organizations table if not exists
  await db.schema
    .createTable("organizations")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("org_identifier", "text", (c) => c.notNull())
    .addColumn("org_name", "varchar(255)", (col) => col.notNull())
    .addColumn("solution_api_url", "text", (c) => c.notNull())
    .addColumn("client_id", "text")
    .addColumn("client_secret", "text")
    .addColumn("network_key", "text")
    .addColumn("org_identifier_description", "text")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // Create users table if not exists
  await db.schema
    .createTable("org_users")
    .ifNotExists()
    .addColumn("user_id", "serial", (col) => col.primaryKey())
    .addColumn("org_id", "integer", (col) => col.notNull())
    .addColumn("user_name", "varchar(255)", (col) => col.notNull())
    .addColumn("user_email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("role_id", "integer", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // Create roles table if not exists
  await db.schema
    .createTable("org_roles")
    .ifNotExists()
    .addColumn("role_id", "serial", (col) => col.primaryKey())
    .addColumn("role_name", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await db.schema
    .createTable("org_policies")
    .ifNotExists()
    .addColumn("policy_id", "serial", (col) => col.primaryKey())
    .addColumn("resource_name", "varchar(255)", (col) => col.notNull())
    .addColumn("resource_action", "varchar(255)", (col) => col.notNull())
    .addColumn("policy_description", "text")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await db.schema
    .createTable("role_policies")
    .ifNotExists()
    .addColumn("role_policy_id", "serial", (col) => col.primaryKey())
    .addColumn("role_id", "integer", (col) => col.notNull())
    .addColumn("policy_id", "integer", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("role_policies").ifExists().execute();
  await db.schema.dropTable("org_policies").ifExists().execute();
  await db.schema.dropTable("org_roles").ifExists().execute();
  await db.schema.dropTable("org_users").ifExists().execute();
  await db.schema.dropTable("organizations").ifExists().execute();
}
