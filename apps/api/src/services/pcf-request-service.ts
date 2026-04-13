import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { BadRequestError, ForbiddenError, NotFoundError } from '@src/common/errors';
import { ListQuery, ListResult } from '@src/common/list-query';
import { UserContext } from './user-service';
import { NodeService } from './node-service';
import { NodeConnectionService } from './node-connection-service';
import { PactApiClient, FootprintFilters } from 'pact-api-client';

export interface PcfRequestData {
  id: number;
  fromNodeId: number;
  fromNodeName?: string;
  targetNodeId: number;
  targetNodeName?: string;
  connectionId: number;
  requestEventId: string;
  filters: FootprintFilters;
  status: 'pending' | 'fulfilled' | 'rejected';
  resultCount: number | null;
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
    private internalApiBaseUrl: string
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

    if (connection.fromNodeId !== nodeId) {
      throw new BadRequestError('Connection does not belong to this node');
    }

    // Check user has access to the from-node
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
      : `${this.internalApiBaseUrl}/api/nodes/${targetNode.id}`;

    const source = `${this.internalApiBaseUrl}/api/nodes/${nodeId}`;

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

    // Persist the outgoing request
    const row = await this.db
      .insertInto('pcf_requests')
      .values({
        fromNodeId: nodeId,
        targetNodeId: targetNode.id,
        connectionId,
        requestEventId,
        filters: filters as unknown as Record<string, unknown>,
        status: 'pending',
        resultCount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      ...row,
      filters: row.filters as unknown as FootprintFilters,
      fromNodeName: fromNode.name,
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

    let qb = this.db
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
        'pcf_requests.filters',
        'pcf_requests.status',
        'pcf_requests.resultCount',
        'pcf_requests.createdAt',
        'pcf_requests.updatedAt',
      ])
      .where('pcf_requests.fromNodeId', '=', nodeId);

    const total = (
      await this.db
        .selectFrom('pcf_requests')
        .select((eb) => eb.fn.count('id').as('total'))
        .where('fromNodeId', '=', nodeId)
        .executeTakeFirstOrThrow()
    ).total as number;

    qb = qb.orderBy('pcf_requests.createdAt', query.sortOrder || 'desc');

    const data = await qb.offset(query.offset).limit(query.limit).execute();

    return {
      data: data.map((row) => ({
        ...row,
        filters: row.filters as unknown as FootprintFilters,
      })) as PcfRequestData[],
      pagination: query.pagination(total),
    };
  }

  private decryptSecret(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }
}
