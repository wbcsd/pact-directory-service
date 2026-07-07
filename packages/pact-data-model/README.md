# @wbcsd/pact-data-model

TypeScript data model and JSON Schema validation for the [PACT Data Exchange Protocol](https://docs.carbon-transparency.org/tr/data-exchange-protocol/latest/) (Product Carbon Footprint exchange).

Supports spec versions **2.0**, **2.1**, **2.2**, **2.3**, and **3.0**.

## Installation

```bash
npm install @wbcsd/pact-data-model
```

## Usage

### Versioned imports

Each spec version is available as a separate subpath:

```ts
import type { ProductFootprint } from '@wbcsd/pact-data-model/v3_0';
import { schema, validate } from '@wbcsd/pact-data-model/v3_0';
import type { ProductFootprint } from '@wbcsd/pact-data-model/v2_3';
```

### Validation

```ts
import { schema, validate } from '@wbcsd/pact-data-model/v3_0';

const result = validate(schema.ProductFootprint, myData);
if (result.valid) {
  console.log('Valid PCF');
} else {
  console.error(result.errors);
}
```

### Root import (v3 convenience aliases)

```ts
import { V3_0, validate } from '@wbcsd/pact-data-model';
```

## Available subpaths

| Subpath | Spec version |
|---|---|
| `@wbcsd/pact-data-model/v2_0` | PACT v2.0 |
| `@wbcsd/pact-data-model/v2_1` | PACT v2.1 |
| `@wbcsd/pact-data-model/v2_2` | PACT v2.2 |
| `@wbcsd/pact-data-model/v2_3` | PACT v2.3 |
| `@wbcsd/pact-data-model/v3_0` | PACT v3.0 |
| `@wbcsd/pact-data-model/common` | Shared validation utilities |

## License

MIT
