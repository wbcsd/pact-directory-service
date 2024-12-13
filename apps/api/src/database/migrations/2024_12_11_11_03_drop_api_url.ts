import { Kysely } from "kysely";
import { Database } from "../types";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("companies")
    .dropColumn("solution_api_dev_url")
    .execute();

  await db.schema
    .alterTable("companies")
    .renameColumn("solution_api_prod_url", "solution_api_url")
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("companies")
    .addColumn("solution_api_dev_url", "text")
    .execute();

  await db.schema
    .alterTable("companies")
    .renameColumn("solution_api_url", "solution_api_prod_url")
    .execute();
}
