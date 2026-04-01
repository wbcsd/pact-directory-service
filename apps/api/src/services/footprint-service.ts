import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { NotFoundError, ForbiddenError, BadRequestError } from '@src/common/errors';
import { registerPolicy, Role } from '@src/common/policies';
import { UserContext } from './user-service';
import { ListQuery, ListResult } from '@src/common/list-query';
import { NodeService } from './node-service';

// Register all policies used in this service
registerPolicy([Role.Administrator], 'manage-footprints-own-organization');
registerPolicy([Role.Root], 'manage-footprints-all-organizations');

export interface FootprintData {
  id: string;
  nodeId: number;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFootprintData {
  data: Record<string, any>;
}

export class FootprintService {
  constructor(
    private db: Kysely<Database>,
    private nodeService: NodeService
  ) {}

  /**
   * Create a new footprint record for a node
   */
  async create(
    context: UserContext,
    nodeId: number,
    input: CreateFootprintData
  ): Promise<FootprintData> {
    // Verify the node exists and user has access
    const node = await this.nodeService.get(context, nodeId);

    // Check write access
    const allowed =
      context.policies.includes('manage-footprints-all-organizations') ||
      (context.policies.includes('manage-footprints-own-organization') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to create footprints for this node');
    }

    if (!input.data || typeof input.data !== 'object') {
      throw new BadRequestError('Footprint data is required and must be a valid object');
    }

    const result = await this.db
      .insertInto('product_footprints')
      .values({
        nodeId,
        data: input.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as FootprintData;
  }

  /**
   * Get a single footprint by ID
   */
  async get(context: UserContext, footprintId: string): Promise<FootprintData> {
    const footprint = await this.db
      .selectFrom('product_footprints')
      .selectAll()
      .where('product_footprints.id', '=', footprintId)
      .executeTakeFirst();

    if (!footprint) {
      throw new NotFoundError('Footprint not found');
    }

    // Verify user has access to the node this footprint belongs to
    const node = await this.nodeService.get(context, footprint.nodeId);

    const allowed =
      context.policies.includes('manage-footprints-all-organizations') ||
      (context.policies.includes('manage-footprints-own-organization') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view this footprint');
    }

    return footprint as FootprintData;
  }

  /**
   * List footprints for a specific node
   */
  async listByNode(
    context: UserContext,
    nodeId: number,
    query: ListQuery = ListQuery.default()
  ): Promise<ListResult<FootprintData>> {
    // Verify the node exists and user has access
    const node = await this.nodeService.get(context, nodeId);

    const allowed =
      context.policies.includes('manage-footprints-all-organizations') ||
      (context.policies.includes('manage-footprints-own-organization') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view footprints for this node');
    }

    let qb = this.db
      .selectFrom('product_footprints')
      .selectAll()
      .where('product_footprints.nodeId', '=', nodeId);

    // Get total count
    const total = (
      await this.db
        .selectFrom('product_footprints')
        .select((eb) => eb.fn.count('product_footprints.id').as('total'))
        .where('product_footprints.nodeId', '=', nodeId)
        .executeTakeFirstOrThrow()
    ).total as number;

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const validSortFields = ['createdAt', 'updatedAt'];

    if (validSortFields.includes(sortBy)) {
      qb = qb.orderBy(`product_footprints.${sortBy}` as any, query.sortOrder || 'desc');
    } else {
      qb = qb.orderBy('product_footprints.createdAt', 'desc');
    }

    // Apply pagination
    const data = await qb.offset(query.offset).limit(query.limit).execute();

    return {
      data: data as FootprintData[],
      pagination: query.pagination(total),
    };
  }

  /**
   * Delete a footprint by ID
   */
  async delete(context: UserContext, footprintId: string): Promise<{ success: boolean; footprintId: string }> {
    // Get the footprint first to verify it exists and check access
    const footprint = await this.get(context, footprintId);

    // Access is already checked in get(), but verify write access explicitly
    const node = await this.nodeService.get(context, footprint.nodeId);

    const allowed =
      context.policies.includes('manage-footprints-all-organizations') ||
      (context.policies.includes('manage-footprints-own-organization') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to delete this footprint');
    }

    await this.db
      .deleteFrom('product_footprints')
      .where('id', '=', footprintId)
      .execute();

    return { success: true, footprintId };
  }
}
