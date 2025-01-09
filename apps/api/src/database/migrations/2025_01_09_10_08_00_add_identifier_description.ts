import { Kysely } from "kysely";
import { Database } from "../types";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("companies")
    .addColumn("company_identifier_description", "text")
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("companies")
    .dropColumn("company_identifier_description")
    .execute();
}
