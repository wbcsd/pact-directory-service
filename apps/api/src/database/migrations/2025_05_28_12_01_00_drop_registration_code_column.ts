import { Kysely } from "kysely";
import { Database } from "../types";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("companies")
    .dropColumn("registration_code")
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("companies")
    .addColumn("registration_code", "text", (c) => c.notNull())
    .execute();
}
