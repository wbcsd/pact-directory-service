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

// ---------------------------------------------------------------------------
// Convenience re-exports for the current production version (PACT v3.0)
// Types are aliased with a V3 suffix to make the version explicit at the
// call-site and to allow consumers to import multiple versions side-by-side.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared API query / response types (version-agnostic PACT spec types)
//
// These types are defined by the PACT specification and used both by the
// client (pact-api-client) and the server (api). Keeping them here avoids
// consumers having to import server-interaction types from a client package.
// ---------------------------------------------------------------------------

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/** Filter parameters for ListFootprints per PACT v3 spec §parameters */
export interface FootprintFilters {
  productId?: string[];
  companyId?: string[];
  /** Matches geographyCountry, geographyRegionOrSubregion, or geographyCountrySubdivision */
  geography?: string[];
  /** Matches against productClassifications array */
  classification?: string[];
  status?: string;
  validOn?: string;
  validAfter?: string;
  validBefore?: string;
}

export interface PagedResponse<T> {
  data: T[];
  links?: {
    first?: string;
    last?: string;
    prev?: string;
    next?: string;
  };
}
