/**
 * pact-data-model — public API
 *
 * Version-specific types are available through the version namespaces below.
 * The bare `pact-data-model` import exposes v3 convenience aliases and the
 * shared API types that are version-agnostic (filters, pagination, events).
 *
 * Usage examples:
 *
 *   // Versioned namespace (explicit)
 *   import type { ProductFootprint } from 'pact-data-model/v3_0/types';
 *
 *   // Convenience aliases for the current production version (v3)
 *   import { ProductFootprintV3, EventTypesV3, FootprintFilters } from 'pact-data-model';
 */

// ---------------------------------------------------------------------------
// Version namespaces — all exports of each generated file, grouped by version
// ---------------------------------------------------------------------------
export * as V2_0 from './v2_0';
export * as V2_1 from './v2_1';
export * as V2_2 from './v2_2';
export * as V2_3 from './v2_3';
export * as V3_0 from './v3_0';

export { validate } from './common/validate';
export type { ValidationResult } from './common/validate';
