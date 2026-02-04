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
 * Filter parameters for footprints
 */
export interface FootprintFilters {
  productId?: string;
  companyId?: string;
  geographyCountry?: string;
  status?: string;
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

    if (filters.geographyCountry) {
      filtered = filtered.filter(
        (fp) =>
          fp.pcf.geography?.country?.toLowerCase() ===
          filters.geographyCountry!.toLowerCase()
      );
    }

    if (filters.status) {
      filtered = filtered.filter(
        (fp) => fp.status.toLowerCase() === filters.status!.toLowerCase()
      );
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
