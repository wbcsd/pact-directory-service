import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { NotFoundError, ForbiddenError, BadRequestError } from '@src/common/errors';
import { registerPolicy, Role } from '@src/common/policies';
import { UserContext } from './user-service';
import { ListQuery, ListResult } from '@src/common/list-query';
import { NodeService } from './node-service';
import { schema, validate } from 'pact-data-model/v3_0';

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

    const validation = validate(schema.ProductFootprint, input.data);
    if (!validation.valid) {
      throw new BadRequestError(`Footprint data failed v3.0 schema validation: ${validation.errors.join('; ')}`);
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

  /**
   * Import multiple footprints from a JSON array for a node.
   * Each item is validated against the PACT v3.0 schema before insertion.
   * Returns a summary of how many succeeded and any per-item validation failures.
   */
  async import(
    context: UserContext,
    nodeId: number,
    items: unknown[]
  ): Promise<{
    imported: number;
    failed: number;
    errors: Array<{ index: number; errors: string[] }>;
  }> {
    // Verify the node exists and user has write access
    const node = await this.nodeService.get(context, nodeId);

    const allowed =
      context.policies.includes('manage-footprints-all-organizations') ||
      (context.policies.includes('manage-footprints-own-organization') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to import footprints for this node');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Import payload must be a non-empty array of footprint objects');
    }

    const errors: Array<{ index: number; errors: string[] }> = [];
    const validItems: Record<string, any>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || typeof item !== 'object') {
        errors.push({ index: i, errors: ['Item is not a valid object'] });
        continue;
      }
      const validation = validate(schema.ProductFootprint, item);
      if (!validation.valid) {
        errors.push({ index: i, errors: validation.errors });
      } else {
        validItems.push(item as Record<string, any>);
      }
    }

    if (validItems.length > 0) {
      await this.db
        .insertInto('product_footprints')
        .values(
          validItems.map((data) => ({
            nodeId,
            data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        )
        .execute();
    }

    return {
      imported: validItems.length,
      failed: errors.length,
      errors,
    };
  }
}
