import { Kysely } from "kysely";
import { Database } from "../types";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("companies")
    // TODO post mvp use uuid instead of serial
    .addColumn("id", "serial", (c) => c.primaryKey())
    .addColumn("company_identifier", "text", (c) => c.notNull())
    .addColumn("company_name", "text", (c) => c.notNull())
    .addColumn("solution_api_prod_url", "text", (c) => c.notNull())
    .addColumn("solution_api_dev_url", "text", (c) => c.notNull())
    .addColumn("registration_code", "text", (c) => c.notNull())
    .execute();

  await db.schema
    .createTable("users")
    // TODO post mvp use uuid instead of serial
    .addColumn("id", "serial", (c) => c.primaryKey())
    .addColumn("company_id", "integer", (c) =>
      c.references("companies.id").notNull()
    )
    .addColumn("full_name", "text", (c) => c.notNull())
    .addColumn("email", "text", (c) => c.unique().notNull())
    .addColumn("password", "text", (c) => c.notNull())
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable("company").execute();
  await db.schema.dropTable("user").execute();
}
