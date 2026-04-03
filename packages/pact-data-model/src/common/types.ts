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
