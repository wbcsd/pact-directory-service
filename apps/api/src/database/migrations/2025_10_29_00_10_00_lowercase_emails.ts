/* eslint-disable @typescript-eslint/no-unused-vars */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Update all existing email addresses to lowercase
  await sql`UPDATE users SET email = LOWER(email)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // No down migration - we cannot restore original casing
  // This is acceptable as email addresses should be case-insensitive
}
