/**
 * CLI runner for PactApiClient
 *
 * Usage:
 *   npx ts-node scripts/run-client.ts <baseUrl> <clientId> <clientSecret>
 *
 * Example:
 *   npx ts-node scripts/run-client.ts https://example.com/pact my-client my-secret
 */

import { PactApiClient } from '../src/pact-api-client';

const [, , baseUrl, clientId, clientSecret] = process.argv;

if (!baseUrl || !clientId || !clientSecret) {
  console.error('Usage: tsx scripts/run-client.ts <baseUrl> <clientId> <clientSecret>');
  process.exit(1);
}

async function main(): Promise<void> {
  const client = new PactApiClient(baseUrl, clientId, clientSecret);

  console.log(`Connecting to ${baseUrl} ...`);

  const result = await client.listFootprints();

  console.log(`Found ${result.data.length} footprint(s):`);
  for (const fp of result.data) {
    console.log(`  - [${fp.id}] ${fp.productNameCompany} (${fp.companyName})`);
  }

  if (result.links) {
    console.log('\nPagination links:', result.links);
  }
}

main().catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
