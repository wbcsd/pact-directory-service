import { Kysely, sql } from 'kysely';

/**
 * Move the OAuth2 credentials used against external nodes from the node record
 * onto the connection that uses them.
 *
 * A credential pair authenticates one node to another, which is a property of
 * the connection, not of the target node: several connections may target the
 * same external node with credentials issued separately to each initiator.
 *
 * After this migration `connections.client_id`/`client_secret` is the single
 * home for those credentials, with `credentials_source` recording who issued
 * them:
 *   - 'generated' — issued by this directory for an internal target node
 *   - 'external'  — issued out-of-band by the operator of an external target
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // A connection to an external node may exist before its credentials are known.
  await sql`ALTER TABLE connections ALTER COLUMN client_id DROP NOT NULL`.execute(db);
  await sql`ALTER TABLE connections ALTER COLUMN client_secret DROP NOT NULL`.execute(db);

  await db.schema
    .alterTable('connections')
    .addColumn('credentials_source', 'text', (c) =>
      c.notNull().defaultTo('generated')
    )
    .execute();

  // Backfill from the node record. Secrets are encoded the same way in both
  // tables (see NodeService/NodeConnectionService.encryptSecret), so they copy
  // over verbatim.
  await sql`
    UPDATE connections c
       SET client_id = n.client_id,
           client_secret = n.client_secret,
           credentials_source = 'external',
           updated_at = now()
      FROM nodes n
     WHERE n.id = c.target_node_id
       AND n.type = 'external'
       AND n.client_id IS NOT NULL
  `.execute(db);

  // Connections to an external node that had no stored credentials were sending
  // directory-generated ones, which a third-party PACT API cannot accept. Clear
  // them so the connection shows up as needing credentials.
  await sql`
    UPDATE connections c
       SET client_id = NULL,
           client_secret = NULL,
           credentials_source = 'external',
           updated_at = now()
      FROM nodes n
     WHERE n.id = c.target_node_id
       AND n.type = 'external'
       AND c.credentials_source = 'generated'
  `.execute(db);

  await db.schema.alterTable('nodes').dropColumn('client_id').execute();
  await db.schema.alterTable('nodes').dropColumn('client_secret').execute();
}

/**
 * Best-effort reversal. A node that is the target of several connections with
 * distinct credentials can only get one pair back — the most recently updated
 * connection wins. The NOT NULL constraints on the connection credentials are
 * not restored, because connections created without credentials cannot satisfy
 * them.
 */
export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('nodes').addColumn('client_id', 'text').execute();
  await db.schema.alterTable('nodes').addColumn('client_secret', 'text').execute();

  await sql`
    UPDATE nodes n
       SET client_id = c.client_id,
           client_secret = c.client_secret
      FROM (
        SELECT DISTINCT ON (target_node_id)
               target_node_id, client_id, client_secret
          FROM connections
         WHERE credentials_source = 'external'
           AND client_id IS NOT NULL
         ORDER BY target_node_id, updated_at DESC
      ) c
     WHERE c.target_node_id = n.id
  `.execute(db);

  await db.schema.alterTable('connections').dropColumn('credentials_source').execute();
}
