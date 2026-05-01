import * as fs from 'fs';
import * as path from 'path';
import { validate } from '../src/common/validate';

const SUPPORTED_VERSIONS: Record<string, () => Promise<{ schema: import('../src/common/schema').Schema }>> = {
  '2.0': () => import('../src/v2_0/schema'),
  '2.1': () => import('../src/v2_1/schema'),
  '2.2': () => import('../src/v2_2/schema'),
  '2.3': () => import('../src/v2_3/schema'),
  '3.0': () => import('../src/v3_0/schema'),
};

function usage(): never {
  console.error('Usage: npm run validate <file.json> -- --version=<version>');
  console.error(`Supported versions: ${Object.keys(SUPPORTED_VERSIONS).join(', ')}`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);

  let filePath: string | undefined;
  let version: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--version=')) {
      version = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      filePath = arg;
    }
  }

  if (!filePath || !version) usage();
  if (!SUPPORTED_VERSIONS[version]) {
    console.error(`Unsupported version "${version}". Supported: ${Object.keys(SUPPORTED_VERSIONS).join(', ')}`);
    process.exit(1);
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error(`Invalid JSON in ${filePath}`);
    process.exit(1);
  }

  const { schema } = await SUPPORTED_VERSIONS[version]();
  const footprints = Array.isArray(data) ? data : [data];

  console.log(`Validating ${footprints.length} PCF(s) from ${filePath} against PACT v${version}\n`);

  let allValid = true;

  for (let i = 0; i < footprints.length; i++) {
    const label = footprints.length > 1 ? `PCF #${i + 1}` : 'PCF';
    const result = validate(schema.ProductFootprint, footprints[i]);

    if (result.valid) {
      console.log(`  ✓ ${label}: valid`);
    } else {
      allValid = false;
      console.log(`  ✗ ${label}: ${result.errors.length} error(s)`);
      for (const err of result.errors) {
        console.log(`      - ${err}`);
      }
    }
  }

  console.log();
  if (allValid) {
    console.log(`All ${footprints.length} PCF(s) are valid.`);
  } else {
    console.log('Validation failed.');
    process.exit(1);
  }
}

main();
