/**
 * Common PACT API types
 * Shared across internal and external PACT implementations
 */

/**
 * Pagination parameters for listing footprints
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Filter parameters for footprints (PACT v3 spec)
 * Per https://docs.carbon-transparency.org/tr/data-exchange-protocol/latest/#parameters
 * productId, companyId, geography and classification are arrays of strings
 */
export interface FootprintFilters {
  productId?: string[];
  companyId?: string[];
  geography?: string[]; // Can match geographyCountry, geographyRegionOrSubregion, or geographyCountrySubdivision
  classification?: string[]; // Match against productClassifications array
  status?: string; // Active or Deprecated
  validOn?: string; // ISO 8601 date - footprint valid on this date
  validAfter?: string; // ISO 8601 date - footprint valid after this date
  validBefore?: string; // ISO 8601 date - footprint valid before this date
}

/**
 * Paginated response structure (PACT v3 spec)
 */
export interface PagedResponse<T> {
  data: T[];
  links?: {
    first?: string;
    last?: string;
    prev?: string;
    next?: string;
  };
}
