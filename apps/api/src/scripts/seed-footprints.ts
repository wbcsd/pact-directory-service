/**
 * Seed script to insert PACT v3-compliant product footprints for a given node.
 *
 * Usage:
 *   npx tsx src/scripts/seed-footprints.ts <nodeId>
 *
 * This inserts the mock PACT v3 footprints from data/mock-footprints-v3.ts
 * into the product_footprints table for the specified node.
 */
import { db } from '@src/database/db';
import { mockFootprintsV3 } from '@src/data/mock-footprints-v3';

async function main() {
  const nodeId = parseInt(process.argv[2], 10);
  if (!nodeId || isNaN(nodeId)) {
    console.error('Usage: npx tsx src/scripts/seed-footprints.ts <nodeId>');
    process.exit(1);
  }

  // Verify the node exists
  const node = await db
    .selectFrom('nodes')
    .select(['id'])
    .where('id', '=', nodeId)
    .executeTakeFirst();

  if (!node) {
    console.error(`Node ${nodeId} not found.`);
    process.exit(1);
  }

  // Check existing footprints
  const existing = await db
    .selectFrom('product_footprints')
    .select((eb) => eb.fn.count('id').as('count'))
    .where('nodeId', '=', nodeId)
    .executeTakeFirstOrThrow();

  console.log(`Node ${nodeId} currently has ${existing.count} footprint(s).`);

  // Insert each mock footprint
  const now = new Date();
  for (const footprint of mockFootprintsV3) {
    await db
      .insertInto('product_footprints')
      .values({
        nodeId,
        id: footprint.id, // Use the PACT footprint ID as the primary key
        data: footprint as unknown as Record<string, any>,
        createdAt: now,
        updatedAt: now,
      })
      .execute();

    console.log(`  Inserted footprint: ${footprint.id} (${footprint.productNameCompany})`);
  }

  console.log(`\nDone. Inserted ${mockFootprintsV3.length} PACT v3 footprint(s) for node ${nodeId}.`);
  await db.destroy();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
