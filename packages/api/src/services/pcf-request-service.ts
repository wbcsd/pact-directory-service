import { Kysely, sql } from 'kysely';
import { Database } from '@src/database/types';
import { BadRequestError, ForbiddenError, NotFoundError } from '@src/common/errors';
import { ListQuery, ListResult } from '@src/common/list-query';
import { UserContext } from './user-service';
import { NodeService } from './node-service';
import { NodeConnectionService } from './node-connection-service';
import { PactApiClient, FootprintFilters } from '@wbcsd/pact-api-client';
import { EventTypes } from '@wbcsd/pact-data-model/v3_0';
import logger from '@src/common/logger';
import net from 'net';

export interface PcfRequestData {
  id: number;
  fromNodeId: number | null;
  fromNodeName?: string;
  targetNodeId: number;
  targetNodeName?: string;
  connectionId: number | null;
  requestEventId: string;
  source: string;
  filters: FootprintFilters;
  status: 'pending' | 'fulfilled' | 'rejected';
  resultCount: number | null;
  fulfilledFootprintIds: unknown[] | null;
  direction: 'outgoing' | 'incoming';
  fulfillable?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePcfRequestData {
  connectionId: number;
  filters: FootprintFilters;
}

export class PcfRequestService {
  constructor(
    private db: Kysely<Database>,
    private nodeService: NodeService,
    private nodeConnectionService: NodeConnectionService,
    private directoryApiBaseUrl: string
  ) {}

  async create(
    context: UserContext,
    nodeId: number,
    data: CreatePcfRequestData
  ): Promise<PcfRequestData> {
    const { connectionId, filters } = data;

    // Validate at least one filter field is set
    const hasFilter =
      (filters.productId?.length ?? 0) > 0 ||
      (filters.companyId?.length ?? 0) > 0 ||
      (filters.geography?.length ?? 0) > 0 ||
      (filters.classification?.length ?? 0) > 0 ||
      typeof (filters as Record<string, unknown>).requestComment === 'string' &&
        ((filters as Record<string, unknown>).requestComment as string).trim().length > 0 ||
      !!filters.status ||
      !!filters.validOn ||
      !!filters.validAfter ||
      !!filters.validBefore;

    if (!hasFilter) {
      throw new BadRequestError('At least one filter field must be specified');
    }

    // Verify the connection exists, is accepted, and belongs to this node
    const connection = await this.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', connectionId)
      .where('status', '=', 'accepted')
      .executeTakeFirst();

    if (!connection) {
      throw new NotFoundError('Connection not found or not active');
    }

    // Only the initiating side (fromNodeId) can send PCF requests via a connection.
    // The connection credentials authenticate fromNodeId to targetNodeId's PACT API;
    // they cannot be used in reverse. To send a request in the other direction,
    // a separate outgoing connection must be created.
    if (connection.fromNodeId !== nodeId) {
      throw new BadRequestError('Connection does not belong to this node');
    }

    // Check user has access to this node
    const fromNode = await this.nodeService.get(context, nodeId);

    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === fromNode.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to send PCF requests from this node');
    }

    // Get target node details (for auth config)
    const targetNode = await this.db
      .selectFrom('nodes')
      .select(['id', 'type', 'apiUrl', 'authBaseUrl', 'scope', 'audience', 'resource'])
      .where('id', '=', connection.targetNodeId)
      .executeTakeFirstOrThrow();

    // Build PactApiClient — mirrors requestFootprints() in node-connection-service.ts
    const baseUrl = targetNode.apiUrl
      ? targetNode.apiUrl.replace(/\/$/, '')
      : `${this.directoryApiBaseUrl}/api/nodes/${targetNode.id}`;

    const source = `${this.directoryApiBaseUrl}/api/nodes/${nodeId}`;

    const client = new PactApiClient(
      baseUrl,
      connection.clientId,
      this.decryptSecret(connection.clientSecret),
      source,
      {
        authBaseUrl: targetNode.authBaseUrl ?? undefined,
        scope: targetNode.scope ?? undefined,
        audience: targetNode.audience ?? undefined,
        resource: targetNode.resource ?? undefined,
      }
    );

    // Send the RequestCreatedEvent and get back the event ID
    const requestEventId = await client.sendRequestCreated(filters);

    // Persist the outgoing request.
    // When both nodes share the same database, the target node's event handler
    // may have already inserted an incoming row with the same requestEventId by
    // the time we reach this point (the HTTP call to /3/events is synchronous).
    // On conflict, update only connectionId so the single shared row gains the
    // outgoing context while preserving the `source` field set by the incoming insert.
    const row = await this.db
      .insertInto('pcf_requests')
      .values({
        fromNodeId: nodeId,
        targetNodeId: targetNode.id,
        connectionId: connection.id,
        requestEventId,
        source,
        filters: filters as unknown as Record<string, unknown>,
        status: 'pending',
        resultCount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflict((oc) =>
        oc.columns(['source','requestEventId']).doUpdateSet((eb) => ({
          connectionId: eb.ref('excluded.connectionId'),
        }))
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      ...row,
      filters: row.filters as unknown as FootprintFilters,
      fromNodeName: fromNode.name,
      direction: 'outgoing' as const,
    };
  }

  async list(
    context: UserContext,
    nodeId: number,
    query: ListQuery = ListQuery.default()
  ): Promise<ListResult<PcfRequestData>> {
    const node = await this.nodeService.get(context, nodeId);

    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view PCF requests for this node');
    }

    const total = (
      await this.db
        .selectFrom('pcf_requests')
        .select((eb) => eb.fn.count('id').as('total'))
        .where((eb) => eb.or([
          eb('pcf_requests.fromNodeId', '=', nodeId),
          eb('pcf_requests.targetNodeId', '=', nodeId),
        ]))
        .executeTakeFirstOrThrow()
    ).total as number;

    const rows = await this.db
      .selectFrom('pcf_requests')
      .leftJoin('nodes as fromNode', 'fromNode.id', 'pcf_requests.fromNodeId')
      .leftJoin('nodes as targetNode', 'targetNode.id', 'pcf_requests.targetNodeId')
      .select([
        'pcf_requests.id',
        'pcf_requests.fromNodeId',
        'fromNode.name as fromNodeName',
        'pcf_requests.targetNodeId',
        'targetNode.name as targetNodeName',
        'pcf_requests.connectionId',
        'pcf_requests.requestEventId',
        'pcf_requests.source',
        'pcf_requests.filters',
        'pcf_requests.status',
        'pcf_requests.resultCount',
        'pcf_requests.fulfilledFootprintIds',
        'pcf_requests.createdAt',
        'pcf_requests.updatedAt',
      ])
      .where((eb) => eb.or([
        eb('pcf_requests.fromNodeId', '=', nodeId),
        eb('pcf_requests.targetNodeId', '=', nodeId),
      ]))
      .orderBy('pcf_requests.createdAt', query.sortOrder || 'desc')
      .offset(query.offset)
      .limit(query.limit)
      .execute();

    // Compute fulfillable for incoming pending rows
    const data = await Promise.all(rows.map(async (row) => {
      const direction: 'outgoing' | 'incoming' = row.fromNodeId === nodeId ? 'outgoing' : 'incoming';
      const base: PcfRequestData = {
        ...row,
        fromNodeName: row.fromNodeName ?? undefined,
        targetNodeName: row.targetNodeName ?? undefined,
        filters: row.filters as unknown as FootprintFilters,
        fulfilledFootprintIds: row.fulfilledFootprintIds as unknown[] | null,
        direction,
      };

      if (direction === 'incoming' && row.status === 'pending') {
        const filters = base.filters;
        const productIds = filters.productId ?? [];
        if (productIds.length > 0) {
          const match = await this.db
            .selectFrom('product_footprints')
            .select('id')
            .where('nodeId', '=', nodeId)
            .where((eb) => eb.or(
              productIds.map((pid) =>
                sql<boolean>`${eb.ref('data')}->'productIds' @> ${sql`${JSON.stringify([pid])}::jsonb`}`
              )
            ))
            .limit(1)
            .executeTakeFirst();
          base.fulfillable = !!match;
        } else {
          // No productId filter — check if node has any footprints
          const any = await this.db
            .selectFrom('product_footprints')
            .select('id')
            .where('nodeId', '=', nodeId)
            .limit(1)
            .executeTakeFirst();
          base.fulfillable = !!any;
        }
      }

      return base;
    }));

    return { data, pagination: query.pagination(total) };
  }

  async fulfill(
    context: UserContext,
    nodeId: number,
    requestId: number,
    footprintIds: string[]
  ): Promise<void> {
    if (!footprintIds || footprintIds.length === 0) {
      throw new BadRequestError('At least one footprint ID must be provided');
    }

    const node = await this.nodeService.get(context, nodeId);

    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to fulfill PCF requests for this node');
    }

    const request = await this.db
      .selectFrom('pcf_requests')
      .selectAll()
      .where('id', '=', requestId)
      .where('targetNodeId', '=', nodeId)
      .where('status', '=', 'pending')
      .executeTakeFirst();

    if (!request) {
      throw new NotFoundError('Pending incoming PCF request not found');
    }

    // Load the selected footprints by their DB row ID (product_footprints.id).
    // The form sends DB UUIDs, NOT the PACT data ID inside the JSON blob.
    const footprintRows = await this.db
      .selectFrom('product_footprints')
      .select('data')
      .where('nodeId', '=', nodeId)
      .where('id', 'in', footprintIds)
      .execute();

    if (footprintRows.length === 0) {
      throw new NotFoundError('No matching footprints found');
    }

    const footprints = footprintRows.map((r) => r.data);

    // Send RequestFulfilledEvent callback using trusted node metadata.
    const callbackUrl = await this.resolveTrustedCallbackUrl(nodeId, request.fromNodeId ?? null);

    if (callbackUrl) {
      const authToken = await this.getCallbackToken(nodeId, request.fromNodeId ?? null);
      const selfSource = `${this.directoryApiBaseUrl}/api/nodes/${nodeId}`;

      const event = {
        type: EventTypes.RequestFulfilled,
        specversion: '1.0',
        id: crypto.randomUUID(),
        source: selfSource,
        time: new Date().toISOString(),
        data: { requestEventId: request.requestEventId, pfs: footprints },
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        logger.warn(
          { nodeId, requestId, status: response.status, body },
          'RequestFulfilledEvent callback failed, still marking fulfilled'
        );
      }
    } else {
      logger.warn({ nodeId, requestId }, 'No callback source URL on record — marking fulfilled without notification');
    }

    await this.db
      .updateTable('pcf_requests')
      .set({
        status: 'fulfilled',
        resultCount: footprints.length,
        fulfilledFootprintIds: JSON.stringify(footprintIds) as unknown as unknown[],
        updatedAt: new Date(),
      })
      .where('id', '=', requestId)
      .execute();

    // When the requesting node is local (shares this database), write the PCFs
    // directly into its product_footprints. This is required because the HTTP
    // callback path (above) may fail if no reverse connection exists for auth.
    if (request.fromNodeId !== null) {
      const requesterNodeExists = await this.db
        .selectFrom('nodes')
        .select('id')
        .where('id', '=', request.fromNodeId)
        .executeTakeFirst();

      if (requesterNodeExists) {
        for (const pf of footprints) {
          const pfData = pf as Record<string, unknown>;
          if (!pfData?.id) continue;

          await this.db
            .insertInto('product_footprints')
            .values({
              id: pfData.id as string,
              nodeId: request.fromNodeId,
              data: pfData,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .onConflict((oc) =>
              oc.columns(['id', 'nodeId']).doUpdateSet({
                data: pfData,
                updatedAt: new Date(),
              })
            )
            .execute();
        }
        logger.info({ nodeId, requestId, fromNodeId: request.fromNodeId, count: footprints.length }, 'PCFs written directly to requester node records (local node)');
      }
    }

    logger.info({ nodeId, requestId, footprintCount: footprints.length }, 'PCF request fulfilled');
  }

  async reject(
    context: UserContext,
    nodeId: number,
    requestId: number
  ): Promise<void> {
    const node = await this.nodeService.get(context, nodeId);

    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to reject PCF requests for this node');
    }

    const request = await this.db
      .selectFrom('pcf_requests')
      .selectAll()
      .where('id', '=', requestId)
      .where('targetNodeId', '=', nodeId)
      .where('status', '=', 'pending')
      .executeTakeFirst();

    if (!request) {
      throw new NotFoundError('Pending incoming PCF request not found');
    }

    const callbackUrl = await this.resolveTrustedCallbackUrl(nodeId, request.fromNodeId ?? null);

    if (callbackUrl) {
      const authToken = await this.getCallbackToken(nodeId, request.fromNodeId ?? null);
      const selfSource = `${this.directoryApiBaseUrl}/api/nodes/${nodeId}`;

      const event = {
        type: EventTypes.RequestRejected,
        specversion: '1.0',
        id: crypto.randomUUID(),
        source: selfSource,
        time: new Date().toISOString(),
        data: { requestEventId: request.requestEventId, error: { code: 'AccessDenied', message: 'The request was rejected by the data owner.' } },
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        logger.warn({ nodeId, requestId, status: response.status, body }, 'RequestRejectedEvent callback failed, still marking rejected');
      }
    } else {
      logger.warn({ nodeId, requestId }, 'No callback source URL on record — marking rejected without notification');
    }

    await this.db
      .updateTable('pcf_requests')
      .set({ status: 'rejected', updatedAt: new Date() })
      .where('id', '=', requestId)
      .execute();

    logger.info({ nodeId, requestId }, 'PCF request rejected');
  }

  /**
   * Get an auth token to send callbacks to the node that submitted the request.
   * Finds the reverse connection (this node → from node) and authenticates.
   */
  private async getCallbackToken(nodeId: number, fromNodeId: number | null): Promise<string> {
    try {
      // Find outgoing accepted connection from this node to the requester
      const connection = fromNodeId
        ? await this.db
            .selectFrom('connections')
            .select(['clientId', 'clientSecret'])
            .where('fromNodeId', '=', nodeId)
            .where('targetNodeId', '=', fromNodeId)
            .where('status', '=', 'accepted')
            .executeTakeFirst()
        : null;

      if (!connection) {
        logger.warn({ nodeId, fromNodeId }, 'No reverse connection found for callback auth — proceeding unauthenticated');
        return '';
      }

      const clientSecret = this.decryptSecret(connection.clientSecret);
      const authUrl = `${this.directoryApiBaseUrl}/api/nodes/${fromNodeId}/auth/token`;
      const basicAuth = Buffer.from(`${connection.clientId}:${clientSecret}`).toString('base64');

      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (authResponse.ok) {
        const tokenData = await authResponse.json() as { access_token: string };
        return tokenData.access_token;
      }

      logger.warn({ nodeId, fromNodeId, status: authResponse.status }, 'Failed to obtain callback auth token');
      return '';
    } catch (err) {
      logger.warn({ nodeId, fromNodeId, error: (err as Error).message }, 'Error obtaining callback auth token');
      return '';
    }
  }

  private async resolveTrustedCallbackUrl(
    targetNodeId: number,
    fromNodeId: number | null
  ): Promise<string | null> {
    if (!fromNodeId) {
      return null;
    }

    const requesterNode = await this.db
      .selectFrom('nodes')
      .select(['id', 'apiUrl'])
      .where('id', '=', fromNodeId)
      .executeTakeFirst();

    if (!requesterNode) {
      logger.warn({ targetNodeId, fromNodeId }, 'Requester node not found — skipping callback');
      return null;
    }

    const callbackBase = requesterNode.apiUrl
      ? requesterNode.apiUrl.replace(/\/+$/, '')
      : `${this.directoryApiBaseUrl}/api/nodes/${fromNodeId}`;

    const callbackUrl = callbackBase.endsWith('/3/events')
      ? callbackBase
      : `${callbackBase}/3/events`;

    if (!this.isSafeCallbackUrl(callbackUrl)) {
      logger.warn(
        { targetNodeId, fromNodeId, callbackUrl },
        'Unsafe callback URL rejected — skipping callback'
      );
      return null;
    }

    return callbackUrl;
  }

  private isSafeCallbackUrl(urlString: string): boolean {
    try {
      const callbackUrl = new URL(urlString);
      const directoryOrigin = new URL(this.directoryApiBaseUrl).origin;

      // Strict by default: only HTTPS callbacks unless using our own directory origin.
      if (callbackUrl.protocol !== 'https:' && callbackUrl.origin !== directoryOrigin) {
        return false;
      }

      if (callbackUrl.origin === directoryOrigin) {
        return true;
      }

      const host = callbackUrl.hostname.toLowerCase();
      if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '::1') {
        return false;
      }

      const ipVersion = net.isIP(host);
      if (ipVersion === 4 && this.isPrivateIpv4(host)) {
        return false;
      }

      if (ipVersion === 6 && this.isPrivateOrLocalIpv6(host)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private isPrivateIpv4(ip: string): boolean {
    const [a, b] = ip.split('.').map(Number);
    if ([a, b].some((n) => Number.isNaN(n))) {
      return true;
    }

    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;

    return false;
  }

  private isPrivateOrLocalIpv6(ip: string): boolean {
    const normalized = ip.toLowerCase();
    return (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80')
    );
  }

  private decryptSecret(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }
}
