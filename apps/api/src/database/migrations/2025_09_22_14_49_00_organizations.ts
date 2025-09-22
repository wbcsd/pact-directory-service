import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Create organizations table if not exists
  await db.schema
    .createTable("organizations")
    .ifNotExists()
    .addColumn("org_id", "serial", (col) => col.primaryKey())
    .addColumn("org_name", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("company_identifier", "text", (c) => c.notNull())
    .addColumn("company_name", "text", (c) => c.notNull())
    .addColumn("solution_api_prod_url", "text", (c) => c.notNull())
    .addColumn("solution_api_dev_url", "text", (c) => c.notNull())
    .addColumn("registration_code", "text", (c) => c.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
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
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // Create roles table if not exists
  await db.schema
    .createTable("org_roles")
    .ifNotExists()
    .addColumn("role_id", "serial", (col) => col.primaryKey())
    .addColumn("role_name", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
}
