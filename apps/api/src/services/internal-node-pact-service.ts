import { ProductFootprintV3 } from "../models/pact-v3/product-footprint";
import { mockFootprintsV3 } from "../data/mock-footprints-v3";

/**
 * Pagination parameters for listing footprints
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Filter parameters for footprints (PACT v3 spec)
 */
export interface FootprintFilters {
  productId?: string;
  companyId?: string;
  geography?: string; // Can match geographyCountry, geographyRegionOrSubregion, or geographyCountrySubdivision
  classification?: string; // Match against productClassifications array
  status?: string; // Active or Deprecated
  validOn?: string; // ISO 8601 date - footprint valid on this date
  validAfter?: string; // ISO 8601 date - footprint valid after this date
  validBefore?: string; // ISO 8601 date - footprint valid before this date
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  links?: {
    first?: string;
    last?: string;
    prev?: string;
    next?: string;
  };
}

/**
 * Service for handling Internal Node PACT API operations
 * Provides virtualized PACT v3-compliant endpoints with mock data
 */
export class InternalNodePactService {
  private footprints: ProductFootprintV3[];

  constructor() {
    this.footprints = mockFootprintsV3;
  }

  /**
   * Get list of product footprints (v3)
   */
  getFootprints(
    filters: FootprintFilters = {},
    pagination: PaginationParams = {}
  ): PaginatedResponse<ProductFootprintV3> {
    let filtered = this.footprints;

    // Apply filters
    if (filters.productId) {
      filtered = filtered.filter((fp) =>
        fp.productIds.some((id) => id.includes(filters.productId!))
      );
    }

    if (filters.companyId) {
      filtered = filtered.filter((fp) =>
        fp.companyIds.some((id) => id.includes(filters.companyId!))
      );
    }

    if (filters.geography) {
      filtered = filtered.filter(
        (fp) =>
          fp.pcf.geography?.country?.toLowerCase() ===
            filters.geography!.toLowerCase() ||
          fp.pcf.geography?.regionOrSubregion?.toLowerCase() ===
            filters.geography!.toLowerCase() ||
          fp.pcf.geography?.countrySubdivision?.toLowerCase() ===
            filters.geography!.toLowerCase()
      );
    }

    if (filters.classification) {
      filtered = filtered.filter((fp) =>
        fp.productClassifications?.some((pc) => pc.classId === filters.classification)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(
        (fp) => fp.status.toLowerCase() === filters.status!.toLowerCase()
      );
    }

    // validOn: Footprint must be valid on the specified date
    if (filters.validOn) {
      const validOnDate = new Date(filters.validOn);
      filtered = filtered.filter((fp) => {
        if (fp.validityPeriod?.start && fp.validityPeriod?.end) {
          const start = new Date(fp.validityPeriod.start);
          const end = new Date(fp.validityPeriod.end);
          return validOnDate >= start && validOnDate <= end;
        }
        // Fallback to reference period if validityPeriod not available
        if (fp.pcf.referencePeriod) {
          const start = new Date(fp.pcf.referencePeriod.start);
          const end = new Date(fp.pcf.referencePeriod.end);
          return validOnDate >= start && validOnDate <= end;
        }
        return false;
      });
    }

    // validAfter: Footprint validity start or reference period start must be after this date
    if (filters.validAfter) {
      const validAfterDate = new Date(filters.validAfter);
      filtered = filtered.filter((fp) => {
        const validityStart = fp.validityPeriod?.start
          ? new Date(fp.validityPeriod.start)
          : new Date(fp.pcf.referencePeriod.start);
        return validityStart >= validAfterDate;
      });
    }

    // validBefore: Footprint validity end or reference period end must be before this date
    if (filters.validBefore) {
      const validBeforeDate = new Date(filters.validBefore);
      filtered = filtered.filter((fp) => {
        const validityEnd = fp.validityPeriod?.end
          ? new Date(fp.validityPeriod.end)
          : new Date(fp.pcf.referencePeriod.end);
        return validityEnd <= validBeforeDate;
      });
    }

    // Apply pagination
    const limit = pagination.limit || 10;
    const offset = pagination.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      data: paginated,
      links: this.buildPaginationLinks(filtered.length, limit, offset),
    };
  }

  /**
   * Get single footprint by ID (v3)
   */
  getFootprintById(id: string): ProductFootprintV3 | null {
    return this.footprints.find((fp) => fp.id === id) || null;
  }

  /**
   * Build pagination links for Link header
   */
  private buildPaginationLinks(
    total: number,
    limit: number,
    offset: number
  ): PaginatedResponse<any>["links"] {
    if (total <= limit) {
      return undefined;
    }

    const links: PaginatedResponse<any>["links"] = {};

    // First link
    if (offset > 0) {
      links.first = `?limit=${limit}&offset=0`;
    }

    // Previous link
    if (offset > 0) {
      const prevOffset = Math.max(0, offset - limit);
      links.prev = `?limit=${limit}&offset=${prevOffset}`;
    }

    // Next link
    if (offset + limit < total) {
      const nextOffset = offset + limit;
      links.next = `?limit=${limit}&offset=${nextOffset}`;
    }

    // Last link
    if (offset + limit < total) {
      const lastOffset = Math.floor((total - 1) / limit) * limit;
      links.last = `?limit=${limit}&offset=${lastOffset}`;
    }

    return Object.keys(links).length > 0 ? links : undefined;
  }

  /**
   * Build Link header from links object
   */
  buildLinkHeader(
    links: PaginatedResponse<any>["links"],
    baseUrl: string
  ): string | undefined {
    if (!links) return undefined;

    const linkParts: string[] = [];

    if (links.first) {
      linkParts.push(`<${baseUrl}${links.first}>; rel="first"`);
    }
    if (links.prev) {
      linkParts.push(`<${baseUrl}${links.prev}>; rel="prev"`);
    }
    if (links.next) {
      linkParts.push(`<${baseUrl}${links.next}>; rel="next"`);
    }
    if (links.last) {
      linkParts.push(`<${baseUrl}${links.last}>; rel="last"`);
    }

    return linkParts.length > 0 ? linkParts.join(", ") : undefined;
  }
}
