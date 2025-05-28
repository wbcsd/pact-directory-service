import { Kysely } from "kysely";
import { Database } from "../types";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable("registration_codes").execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("registration_codes")
    .addColumn("code", "text", (col) => col.primaryKey())
    .execute();
}
