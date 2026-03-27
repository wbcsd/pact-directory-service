import { Kysely, sql } from 'kysely';
import { Database } from '@src/database/types';
import { BadRequestError } from '@src/common/errors';
import { FootprintFilters, PaginationParams, PagedResponse } from '@src/models/pact-v3/types';
import { ProductFootprintV3 } from '@src/models/pact-v3/product-footprint';
import { EventTypesV3 } from '@src/models/pact-v3/events';
import logger from '@src/common/logger';
import config from '@src/common/config';

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
  async getFootprints(
    nodeId: number,
    filters: FootprintFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PagedResponse<ProductFootprintV3>> {
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

    const data = rows.map((row) => row.data as unknown as ProductFootprintV3);

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
  ): Promise<ProductFootprintV3 | null> {
    const row = await this.db
      .selectFrom('product_footprints')
      .select(['data'])
      .where('nodeId', '=', nodeId)
      .where(sql`data->>'id'`, '=', footprintId)
      .executeTakeFirst();

    if (!row) return null;
    return row.data as unknown as ProductFootprintV3;
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
  async handleEvent(
    nodeId: number,
    event: {
      type: string;
      specversion: string;
      id: string;
      source: string;
      time?: string;
      data?: Record<string, any>;
    }
  ): Promise<void> {
    const { type, id, source, data } = event;

    // UUID v4 regex for validating pfIds
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    switch (type) {
      case EventTypesV3.PUBLISHED: {
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

      case EventTypesV3.REQUEST_CREATED: {
        logger.info(
          { nodeId, eventId: id, source, productId: data?.productId },
          'Received RequestCreatedEvent for internal node'
        );
        // Fire-and-forget: look up footprints and send callback
        this.handleRequestCreatedEvent(nodeId, id, source, data).catch((err) =>
          logger.error(
            { nodeId, eventId: id, error: (err as Error).message },
            'Failed to handle RequestCreatedEvent callback'
          )
        );
        break;
      }

      case EventTypesV3.REQUEST_FULFILLED: {
        logger.info(
          { nodeId, eventId: id },
          'Received RequestFulfilledEvent for internal node'
        );
        break;
      }

      case EventTypesV3.REQUEST_REJECTED: {
        logger.info(
          { nodeId, eventId: id },
          'Received RequestRejectedEvent for internal node'
        );
        break;
      }

      default:
        throw new BadRequestError(`Unsupported event type: ${type}`);
    }
  }

  // ────────────────────────────── Private helpers ──────────────────────────────

  /**
   * Handle the async callback flow for a RequestCreatedEvent.
   *
   * 1. Search the node's footprints by the requested productId(s).
   * 2. If found → POST a RequestFulfilledEvent to the source.
   * 3. If not found → POST a RequestRejectedEvent to the source.
   *
   * The `source` field of the incoming event is used as the callback URL's
   * base, with `/3/events` appended.
   */
  private async handleRequestCreatedEvent(
    nodeId: number,
    requestEventId: string,
    source: string,
    data?: Record<string, any>
  ): Promise<void> {
    const productIds: string[] = data?.productId ?? [];

    // Search footprints matching any of the requested product IDs
    let matchingFootprints: ProductFootprintV3[] = [];

    if (productIds.length > 0) {
      const rows = await this.db
        .selectFrom('product_footprints')
        .select(['data'])
        .where('nodeId', '=', nodeId)
        .where((eb) => {
          const conditions = productIds.map((pid) =>
            sql`${eb.ref('data')}->'productIds' @> ${sql`${JSON.stringify([pid])}::jsonb`}`
          );
          return eb.or(conditions.map((c) => eb(c, 'is not', null)));
        })
        .execute();

      matchingFootprints = rows.map(
        (r) => r.data as unknown as ProductFootprintV3
      );
    }

    // Determine callback URL — the conformance test service or the event source
    const callbackUrl = source.endsWith('/3/events')
      ? source
      : `${source.replace(/\/+$/, '')}/3/events`;

    // Obtain auth token for the callback
    const authToken = await this.getCallbackToken(nodeId);

    if (matchingFootprints.length > 0) {
      // RequestFulfilledEvent
      const fulfilledEvent = {
        type: EventTypesV3.REQUEST_FULFILLED,
        specversion: '1.0',
        id: crypto.randomUUID(),
        source: `${config.INTERNAL_API_BASE_URL}/api/nodes/${nodeId}`,
        time: new Date().toISOString(),
        data: {
          requestEventId,
          pfs: matchingFootprints,
        },
      };

      await this.postEvent(callbackUrl, fulfilledEvent, authToken);

      logger.info(
        { nodeId, requestEventId, matchCount: matchingFootprints.length },
        'Sent RequestFulfilledEvent callback'
      );
    } else {
      // RequestRejectedEvent
      const rejectedEvent = {
        type: EventTypesV3.REQUEST_REJECTED,
        specversion: '1.0',
        id: crypto.randomUUID(),
        source: `${config.INTERNAL_API_BASE_URL}/api/nodes/${nodeId}`,
        time: new Date().toISOString(),
        data: {
          requestEventId,
          error: {
            code: 'NotFound',
            message: 'The requested footprint could not be found.',
          },
        },
      };

      await this.postEvent(callbackUrl, rejectedEvent, authToken);

      logger.info(
        { nodeId, requestEventId },
        'Sent RequestRejectedEvent callback'
      );
    }
  }

  /**
   * Obtain an auth token for making callbacks to the conformance service.
   * Uses the first outgoing accepted connection's credentials from this node.
   */
  private async getCallbackToken(nodeId: number): Promise<string> {
    try {
      const connection = await this.db
        .selectFrom('connections')
        .select(['clientId', 'clientSecret'])
        .where('fromNodeId', '=', nodeId)
        .where('status', '=', 'accepted')
        .limit(1)
        .executeTakeFirst();

      if (!connection) {
        logger.warn({ nodeId }, 'No outgoing connection found for callback auth');
        return '';
      }

      // Decrypt the client secret (base64-encoded)
      const clientSecret = Buffer.from(connection.clientSecret, 'base64').toString('utf-8');

      // Authenticate against the conformance service auth endpoint
      const authUrl = `${config.CONFORMANCE_API_INTERNAL}/auth/token`;
      const basicAuth = Buffer.from(
        `${connection.clientId}:${clientSecret}`
      ).toString('base64');

      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (authResponse.ok) {
        const tokenData = (await authResponse.json()) as { access_token: string };
        return tokenData.access_token;
      }

      logger.warn(
        { nodeId, status: authResponse.status },
        'Failed to obtain callback auth token'
      );
      return '';
    } catch (err) {
      logger.warn(
        { nodeId, error: (err as Error).message },
        'Error obtaining callback auth token'
      );
      return '';
    }
  }

  /**
   * POST a CloudEvent to a target URL
   */
  private async postEvent(
    url: string,
    event: Record<string, any>,
    authToken: string
  ): Promise<void> {
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
        return eb.or(conditions.map((c: any) => eb(c, 'is not', null)));
      });
    }

    // companyId — match if data->'companyIds' contains any of the filter values (OR logic)
    if (filters.companyId && filters.companyId.length > 0) {
      qb = qb.where((eb: any) => {
        const conditions = filters.companyId!.map((cid) =>
          sql`${eb.ref('data')}->'companyIds' @> ${sql`${JSON.stringify([cid])}::jsonb`}`
        );
        return eb.or(conditions.map((c: any) => eb(c, 'is not', null)));
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
        return eb.or(geoConditions.map((c: any) => eb(c, 'is not', null)));
      });
    }

    // classification — match against data->'productClassifications' (URN string array)
    if (filters.classification && filters.classification.length > 0) {
      qb = qb.where((eb: any) => {
        const conditions = filters.classification!.map((cls) =>
          sql`${eb.ref('data')}->'productClassifications' @> ${sql`${JSON.stringify([cls])}::jsonb`}`
        );
        return eb.or(conditions.map((c: any) => eb(c, 'is not', null)));
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
