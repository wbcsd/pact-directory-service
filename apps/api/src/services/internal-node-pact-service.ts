import { Kysely, sql } from 'kysely';
import { Database } from '@src/database/types';
import { BadRequestError } from '@src/common/errors';
import { FootprintFilters, PaginationParams, PagedResponse, ProductFootprint, EventTypes, RequestCreatedEvent, BaseEvent } from 'pact-data-model/v3_0';
import logger from '@src/common/logger';

/**
 * Service for handling Internal Node PACT API operations
 * Provides PACT v3-compliant endpoints backed by the product_footprints table
 *
 * Each row in product_footprints has:
 *   id       – UUID (auto-generated)
 *   nodeId   – FK to nodes
 *   data     – JSONB storing the full PACT v3 ProductFootprint object
 *   createdAt / updatedAt
 */
export class InternalNodePactService {

  constructor(private db: Kysely<Database>) {}

  /**
   * Get list of product footprints (v3) for a given node.
   * Applies PACT v3 filtering on the JSONB `data` column.
   */
  public async getFootprints(
    nodeId: number,
    filters: FootprintFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PagedResponse<ProductFootprint>> {

    let qb = this.db
      .selectFrom('product_footprints')
      .select(['data'])
      .where('nodeId', '=', nodeId);

    // Apply PACT v3 filters on JSONB data column
    qb = this.applyFilters(qb, filters);

    // Count total matching results (before pagination)
    let countQb = this.db
      .selectFrom('product_footprints')
      .select((eb) => eb.fn.count('id').as('total'))
      .where('nodeId', '=', nodeId);
    countQb = this.applyFilters(countQb, filters);
    const { total } = await countQb.executeTakeFirstOrThrow();
    const totalCount = Number(total);

    // Apply pagination
    const limit = pagination.limit || 10;
    const offset = pagination.offset || 0;

    const rows = await qb
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    const data = rows.map((row) => row.data as unknown as ProductFootprint);

    return {
      data,
      links: this.buildPaginationLinks(totalCount, limit, offset),
    };
  }

  /**
   * Get single footprint by ID (v3)
   */
  async getFootprintById(
    nodeId: number,
    footprintId: string
  ): Promise<ProductFootprint | null> {
    const row = await this.db
      .selectFrom('product_footprints')
      .select(['data'])
      .where('nodeId', '=', nodeId)
      .where(sql`data->>'id'`, '=', footprintId)
      .executeTakeFirst();

    if (!row) return null;
    return row.data as unknown as ProductFootprint;
  }

  /**
   * Handle incoming PACT v3 CloudEvents.
   *
   * - PublishedEvent:        acknowledge (200)
   * - RequestCreatedEvent:   look up matching footprints by productId and
   *                          call back with RequestFulfilledEvent or RequestRejectedEvent
   * - RequestFulfilledEvent: acknowledge (200) — inbound fulfillments
   * - RequestRejectedEvent:  acknowledge (200) — inbound rejections
   */
  public async handleEvent(
    nodeId: number,
    event: BaseEvent
  ) {
    const { type, id, source, data } = event;

    // UUID v4 regex for validating pfIds
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    switch (type) {
      case EventTypes.Published: {
        // Validate pfIds are present and contain valid UUIDs
        if (!data?.pfIds || !Array.isArray(data.pfIds) || data.pfIds.length === 0) {
          throw new BadRequestError('PublishedEvent data must contain a non-empty pfIds array');
        }
        for (const pfId of data.pfIds) {
          if (typeof pfId !== 'string' || !uuidRegex.test(pfId)) {
            throw new BadRequestError(`Invalid pfId format: ${pfId}. pfIds must be valid UUIDs.`);
          }
        }

        logger.info(
          { nodeId, eventId: id, pfIds: data?.pfIds },
          'Received PublishedEvent for internal node'
        );
        break;
      }

      case EventTypes.RequestCreated: {
        logger.info(
          { nodeId, eventId: id, source, productId: data?.productId },
          'Received RequestCreatedEvent for internal node — saving to inbox'
        );
        await this.handleRequestCreatedEvent(nodeId, id, source, event as RequestCreatedEvent);
        break;
      }

      case EventTypes.RequestFulfilled: {
        logger.info(
          { nodeId, eventId: id },
          'Received RequestFulfilledEvent for internal node'
        );
        // Update the matching outgoing PCF request record
        // The outgoing row has fromNodeId = this node (the one that sent the request)
        const requestEventId = data?.requestEventId as string | undefined;
        const pfs = data?.pfs as unknown[] | undefined;
        if (requestEventId) {
          await this.db
            .updateTable('pcf_requests')
            .set({
              status: 'fulfilled',
              resultCount: pfs?.length ?? 0,
              updatedAt: new Date(),
            })
            .where('requestEventId', '=', requestEventId)
            .where('fromNodeId', '=', nodeId)
            .execute();
        }
        break;
      }

      case EventTypes.RequestRejected: {
        logger.info(
          { nodeId, eventId: id },
          'Received RequestRejectedEvent for internal node'
        );
        // Update the matching outgoing PCF request record
        const rejectedRequestEventId = data?.requestEventId as string | undefined;
        if (rejectedRequestEventId) {
          await this.db
            .updateTable('pcf_requests')
            .set({
              status: 'rejected',
              updatedAt: new Date(),
            })
            .where('requestEventId', '=', rejectedRequestEventId)
            .where('fromNodeId', '=', nodeId)
            .execute();
        }
        break;
      }

      default:
        throw new BadRequestError(`Unsupported event type: ${type}`);
    }
  }

  // ────────────────────────────── Private helpers ──────────────────────────────

  /**
   * Handle the async callback flow for a RequestCreatedEvent.
   * Save an incoming RequestCreatedEvent to the pcf_requests table as a pending
   * inbox item. The supplier (nodeId) will fulfill or reject it manually via the
   * dashboard. Idempotent on requestEventId.
   */
  private async handleRequestCreatedEvent(
    nodeId: number,
    requestEventId: string,
    source: string,
    event: RequestCreatedEvent
  ): Promise<void> {
    const filters = event.data as FootprintFilters;

    // Parse fromNodeId from source URL if it's a directory-internal node
    // e.g. "http://localhost:3010/api/nodes/14" → 14
    const fromNodeMatch = source.match(/\/api\/nodes\/(\d+)/);
    const fromNodeId = fromNodeMatch ? parseInt(fromNodeMatch[1], 10) : null;

    await this.db
      .insertInto('pcf_requests')
      .values({
        targetNodeId: nodeId,
        fromNodeId,
        connectionId: null,
        source,
        requestEventId,
        filters: filters as unknown as Record<string, unknown>,
        status: 'pending',
        resultCount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflict((oc) => oc.column('requestEventId').doNothing())
      .execute();

    logger.info({ nodeId, requestEventId, fromNodeId }, 'Incoming PCF request saved to inbox');
  }

  /**
   * POST a CloudEvent to a target URL
   */
  private async postEvent(
    url: string,
    event: BaseEvent,
    authToken: string
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/cloudevents+json; charset=UTF-8',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.warn(
        { url, status: response.status, body },
        'Callback POST returned non-OK status'
      );
    }
  }

  /**
   * Apply PACT v3 filter parameters to a Kysely query builder.
   * All filtering is done on the JSONB `data` column.
   */
  private applyFilters(qb: any, filters: FootprintFilters): any {
    // productId — match if data->'productIds' contains any of the filter values
    if (filters.productId && filters.productId.length > 0) {
      qb = qb.where((eb: any) => {
        const conditions = filters.productId!.map((pid) =>
          sql`${eb.ref('data')}->'productIds' @> ${sql`${JSON.stringify([pid])}::jsonb`}`
        );
        return eb.or(conditions);
      });
    }

    // companyId — match if data->'companyIds' contains any of the filter values (OR logic)
    if (filters.companyId && filters.companyId.length > 0) {
      qb = qb.where((eb: any) => {
        const conditions = filters.companyId!.map((cid) =>
          sql`${eb.ref('data')}->'companyIds' @> ${sql`${JSON.stringify([cid])}::jsonb`}`
        );
        return eb.or(conditions);
      });
    }

    // geography — match against pcf.geographyCountry, pcf.geographyRegionOrSubregion, pcf.geographyCountrySubdivision
    if (filters.geography && filters.geography.length > 0) {
      qb = qb.where((eb: any) => {
        const geoConditions = filters.geography!.map((geo) =>
          sql`(
            ${eb.ref('data')}#>>'{pcf,geographyCountry}' = ${geo}
            OR ${eb.ref('data')}#>>'{pcf,geographyRegionOrSubregion}' = ${geo}
            OR ${eb.ref('data')}#>>'{pcf,geographyCountrySubdivision}' = ${geo}
          )`
        );
        return eb.or(geoConditions);
      });
    }

    // classification — match against data->'productClassifications' (URN string array)
    if (filters.classification && filters.classification.length > 0) {
      qb = qb.where((eb: any) => {
        const conditions = filters.classification!.map((cls) =>
          sql`${eb.ref('data')}->'productClassifications' @> ${sql`${JSON.stringify([cls])}::jsonb`}`
        );
        return eb.or(conditions);
      });
    }

    // status — exact match on data->>'status'
    if (filters.status) {
      qb = qb.where(sql`data->>'status'`, '=', filters.status);
    }

    // validOn — date falls within the validity period [start, end]
    // If validityPeriodStart/End are not set, fallback: start = referencePeriodEnd, end = referencePeriodEnd + 3 years
    if (filters.validOn) {
      qb = qb.where(
        sql`COALESCE(
          (data->>'validityPeriodStart')::timestamptz,
          (data#>>'{pcf,referencePeriodEnd}')::timestamptz
        ) <= ${filters.validOn}::timestamptz`
      ).where(
        sql`COALESCE(
          (data->>'validityPeriodEnd')::timestamptz,
          (data#>>'{pcf,referencePeriodEnd}')::timestamptz + interval '3 years'
        ) >= ${filters.validOn}::timestamptz`
      );
    }

    // validAfter — validity period start > filter date (strict inequality per spec)
    if (filters.validAfter) {
      qb = qb.where(
        sql`COALESCE(
          (data->>'validityPeriodStart')::timestamptz,
          (data#>>'{pcf,referencePeriodEnd}')::timestamptz
        ) > ${filters.validAfter}::timestamptz`
      );
    }

    // validBefore — validity period end < filter date (strict inequality per spec)
    if (filters.validBefore) {
      qb = qb.where(
        sql`COALESCE(
          (data->>'validityPeriodEnd')::timestamptz,
          (data#>>'{pcf,referencePeriodEnd}')::timestamptz + interval '3 years'
        ) < ${filters.validBefore}::timestamptz`
      );
    }

    // Log the generated SQL for debugging
    const { sql: generatedSql, parameters } = qb.compile();
    logger.info(
      { filters, generatedSql, parameters },
      'Compiled SQL query for getFootprints with filters'
    );

    return qb;
  }

  /**
   * Build pagination links for Link header
   */
  private buildPaginationLinks(
    total: number,
    limit: number,
    offset: number
  ): PagedResponse<any>['links'] {
    if (total <= limit && offset === 0) {
      return undefined;
    }

    const links: PagedResponse<any>['links'] = {};

    if (offset > 0) {
      links.first = `?limit=${limit}&offset=0`;
    }

    if (offset > 0) {
      const prevOffset = Math.max(0, offset - limit);
      links.prev = `?limit=${limit}&offset=${prevOffset}`;
    }

    if (offset + limit < total) {
      const nextOffset = offset + limit;
      links.next = `?limit=${limit}&offset=${nextOffset}`;
    }

    if (offset + limit < total) {
      const lastOffset = Math.floor((total - 1) / limit) * limit;
      links.last = `?limit=${limit}&offset=${lastOffset}`;
    }

    return Object.keys(links).length > 0 ? links : undefined;
  }

  /**
   * Build Link header string from links object
   */
  buildLinkHeader(
    links: PagedResponse<any>['links'],
    baseUrl: string
  ): string | undefined {
    if (!links) return undefined;

    const linkParts: string[] = [];

    if (links.first) linkParts.push(`<${baseUrl}${links.first}>; rel="first"`);
    if (links.prev) linkParts.push(`<${baseUrl}${links.prev}>; rel="prev"`);
    if (links.next) linkParts.push(`<${baseUrl}${links.next}>; rel="next"`);
    if (links.last) linkParts.push(`<${baseUrl}${links.last}>; rel="last"`);

    return linkParts.length > 0 ? linkParts.join(', ') : undefined;
  }
}
