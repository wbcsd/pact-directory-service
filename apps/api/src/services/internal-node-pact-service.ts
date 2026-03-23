import { ProductFootprintV3 } from "../models/pact-v3/product-footprint";
import { FootprintFilters, PaginationParams, PagedResponse } from "../models/pact-v3/types";
import { mockFootprintsV3 } from "../data/mock-footprints-v3";

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
   * @param nodeId - The node ID to retrieve footprints for
   * @param filters - Filter parameters
   * @param pagination - Pagination parameters
   */
  getFootprints(
    nodeId: number,
    filters: FootprintFilters = {},
    pagination: PaginationParams = {}
  ): PagedResponse<ProductFootprintV3> {
    let filtered = this.footprints;

    // Apply filters - arrays match if any element is found
    if (filters.productId && filters.productId.length > 0) {
      filtered = filtered.filter((fp) =>
        fp.productIds.some((id) => 
          filters.productId!.some((filterId) => id.includes(filterId))
        )
      );
    }

    if (filters.companyId && filters.companyId.length > 0) {
      filtered = filtered.filter((fp) =>
        fp.companyIds.some((id) => 
          filters.companyId!.some((filterId) => id.includes(filterId))
        )
      );
    }

    if (filters.geography && filters.geography.length > 0) {
      filtered = filtered.filter((fp) => {
        const region = fp.pcf.geographyRegionOrSubregion?.toLowerCase();
        const country = fp.pcf.geographyCountry?.toLowerCase();
        const subdivision = fp.pcf.geographyCountrySubdivision?.toLowerCase();
        
        return filters.geography!.some((geo) => {
          const lowerGeo = geo.toLowerCase();
          return country === lowerGeo || region === lowerGeo || subdivision === lowerGeo;
        });
      });
    }

    if (filters.classification && filters.classification.length > 0) {
      filtered = filtered.filter((fp) =>
        fp.productClassifications?.some((pc) => 
          filters.classification!.includes(pc.classId)
        )
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
        if (fp.validityPeriodStart && fp.validityPeriodEnd) {
          const start = new Date(fp.validityPeriodStart);
          const end = new Date(fp.validityPeriodEnd);
          return validOnDate >= start && validOnDate <= end;
        }
        // Fallback to reference period if validityPeriod not available
        if (fp.pcf.referencePeriodStart && fp.pcf.referencePeriodEnd) {
          const start = new Date(fp.pcf.referencePeriodStart);
          const end = new Date(fp.pcf.referencePeriodEnd);
          return validOnDate >= start && validOnDate <= end;
        }
        return false;
      });
    }

    // validAfter: Footprint validity start or reference period start must be after this date
    if (filters.validAfter) {
      const validAfterDate = new Date(filters.validAfter);
      filtered = filtered.filter((fp) => {
        const validityStart = fp.validityPeriodStart
          ? new Date(fp.validityPeriodStart)
          : new Date(fp.pcf.referencePeriodStart);
        return validityStart >= validAfterDate;
      });
    }

    // validBefore: Footprint validity end or reference period end must be before this date
    if (filters.validBefore) {
      const validBeforeDate = new Date(filters.validBefore);
      filtered = filtered.filter((fp) => {
        const validityEnd = fp.validityPeriodEnd
          ? new Date(fp.validityPeriodEnd)
          : new Date(fp.pcf.referencePeriodEnd);
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
   * @param nodeId - The node ID to retrieve footprint for
   * @param id - Footprint ID
   */
  getFootprintById(nodeId: number, id: string): ProductFootprintV3 | null {
    return this.footprints.find((fp) => fp.id === id) || null;
  }

  /**
   * Build pagination links for Link header
   */
  private buildPaginationLinks(
    total: number,
    limit: number,
    offset: number
  ): PagedResponse<any>["links"] {
    if (total <= limit) {
      return undefined;
    }

    const links: PagedResponse<any>["links"] = {};

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
    links: PagedResponse<any>["links"],
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
