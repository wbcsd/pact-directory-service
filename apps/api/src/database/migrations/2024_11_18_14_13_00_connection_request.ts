import { Kysely } from "kysely";
import { Database } from "../types";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("connection_requests")
    .addColumn("id", "serial", (c) => c.primaryKey())
    .addColumn("requesting_company_id", "integer", (c) =>
      c.references("companies.id").notNull()
    )
    .addColumn("requested_company_id", "integer", (c) =>
      c.references("companies.id").notNull()
    )
    .addColumn("status", "text", (c) => c.notNull())
    .addColumn("created_at", "timestamp", (c) => c.notNull())
    .addColumn("updated_at", "timestamp", (c) => c.notNull())
    .execute();

  await db.schema
    .createTable("connections")
    .addColumn("id", "serial", (c) => c.primaryKey())
    .addColumn("company_a_id", "integer", (c) =>
      c.references("companies.id").notNull()
    )
    .addColumn("company_b_id", "integer", (c) =>
      c.references("companies.id").notNull()
    )
    .addColumn("created_at", "timestamp", (c) => c.notNull())
    .addColumn("updated_at", "timestamp", (c) => c.notNull())
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable("connection_requests").execute();
  await db.schema.dropTable("connections").execute();
}
