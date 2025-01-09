import { Kysely } from "kysely";
import { Database } from "../types";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("companies")
    .renameColumn("network_id", "network_key")
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("companies")
    .renameColumn("network_key", "network_id")
    .execute();
}
