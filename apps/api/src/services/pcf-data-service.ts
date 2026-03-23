import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { NotFoundError, ForbiddenError, BadRequestError } from '@src/common/errors';
import { registerPolicy, Role } from '@src/common/policies';
import { UserContext } from './user-service';
import { ListQuery, ListResult } from '@src/common/list-query';
import { NodeService } from './node-service';

// Register all policies used in this service
registerPolicy([Role.Administrator], 'manage-pcfs-own-organization');
registerPolicy([Role.Root], 'manage-pcfs-all-organizations');

export interface PcfData {
  id: string;
  nodeId: number;
  pcf: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePcfData {
  pcf: Record<string, any>;
}

export class PCFDataService {
  constructor(
    private db: Kysely<Database>,
    private nodeService: NodeService
  ) {}

  /**
   * Create a new PCF record for a node
   */
  async create(
    context: UserContext,
    nodeId: number,
    data: CreatePcfData
  ): Promise<PcfData> {
    // Verify the node exists and user has access
    const node = await this.nodeService.get(context, nodeId);

    // Check write access
    const allowed =
      context.policies.includes('manage-pcfs-all-organizations') ||
      (context.policies.includes('manage-pcfs-own-organization') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to create PCFs for this node');
    }

    if (!data.pcf || typeof data.pcf !== 'object') {
      throw new BadRequestError('PCF data is required and must be a valid object');
    }

    const result = await this.db
      .insertInto('pcfs')
      .values({
        nodeId,
        pcf: data.pcf,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as PcfData;
  }

  /**
   * Get a single PCF by ID
   */
  async get(context: UserContext, pcfId: string): Promise<PcfData> {
    const pcf = await this.db
      .selectFrom('pcfs')
      .selectAll()
      .where('pcfs.id', '=', pcfId)
      .executeTakeFirst();

    if (!pcf) {
      throw new NotFoundError('PCF not found');
    }

    // Verify user has access to the node this PCF belongs to
    const node = await this.nodeService.get(context, pcf.nodeId);

    const allowed =
      context.policies.includes('manage-pcfs-all-organizations') ||
      (context.policies.includes('manage-pcfs-own-organization') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view this PCF');
    }

    return pcf as PcfData;
  }

  /**
   * List PCFs for a specific node
   */
  async listByNode(
    context: UserContext,
    nodeId: number,
    query: ListQuery = ListQuery.default()
  ): Promise<ListResult<PcfData>> {
    // Verify the node exists and user has access
    const node = await this.nodeService.get(context, nodeId);

    const allowed =
      context.policies.includes('manage-pcfs-all-organizations') ||
      (context.policies.includes('manage-pcfs-own-organization') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view PCFs for this node');
    }

    let qb = this.db
      .selectFrom('pcfs')
      .selectAll()
      .where('pcfs.nodeId', '=', nodeId);

    // Get total count
    const total = (
      await this.db
        .selectFrom('pcfs')
        .select((eb) => eb.fn.count('pcfs.id').as('total'))
        .where('pcfs.nodeId', '=', nodeId)
        .executeTakeFirstOrThrow()
    ).total as number;

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const validSortFields = ['createdAt', 'updatedAt'];

    if (validSortFields.includes(sortBy)) {
      qb = qb.orderBy(`pcfs.${sortBy}` as any, query.sortOrder || 'desc');
    } else {
      qb = qb.orderBy('pcfs.createdAt', 'desc');
    }

    // Apply pagination
    const data = await qb.offset(query.offset).limit(query.limit).execute();

    return {
      data: data as PcfData[],
      pagination: query.pagination(total),
    };
  }

  /**
   * Delete a PCF by ID
   */
  async delete(context: UserContext, pcfId: string): Promise<{ success: boolean; pcfId: string }> {
    // Get the PCF first to verify it exists and check access
    const pcf = await this.get(context, pcfId);

    // Access is already checked in get(), but verify write access explicitly
    const node = await this.nodeService.get(context, pcf.nodeId);

    const allowed =
      context.policies.includes('manage-pcfs-all-organizations') ||
      (context.policies.includes('manage-pcfs-own-organization') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to delete this PCF');
    }

    await this.db
      .deleteFrom('pcfs')
      .where('id', '=', pcfId)
      .execute();

    return { success: true, pcfId };
  }
}
