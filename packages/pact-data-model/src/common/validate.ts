import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

/**
 * Validate `data` against any AJV-compatible JSON Schema object.
 *
 * @example
 * import { validate } from 'pact-data-model/common/validate';
 * import schema from 'pact-data-model/v3_0/schema';
 *
 * const result = validate(schema.ProductFootprint, footprintData);
 * const result = validate(schema.RequestFulfilledEvent, eventData);
 */
export function validate(schema: object, data: unknown): ValidationResult {
  const validateFn = ajv.compile(schema as JSONSchemaType<unknown>);
  const valid = validateFn(data) as boolean;
  if (valid) {
    return { valid: true, errors: [] };
  }
  const errors = (validateFn.errors ?? []).map((e) => {
    const field = e.instancePath
      ? e.instancePath.replace(/^\//, '').replace(/\//g, '.')
      : 'root';
    return `${field}: ${e.message}`;
  });
  return { valid: false, errors };
}
