import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { NotFoundError, ForbiddenError, BadRequestError } from '@src/common/errors';
import { registerPolicy, checkAccess, Role } from '@src/common/policies';
import { UserContext } from './user-service';
import { ListQuery, ListResult } from '@src/common/list-query';
import config from '@src/common/config';

// Register all policies used in this service
registerPolicy([Role.Administrator], 'view-nodes-own-organization');
registerPolicy([Role.Administrator], 'edit-nodes-own-organization');
registerPolicy([Role.Root], 'view-nodes-all-organizations');
registerPolicy([Role.Root], 'edit-nodes-all-organizations');

export interface NodeData {
  id: number;
  organizationId: number;
  organizationName?: string;
  name: string;
  type: 'internal' | 'external';
  apiUrl: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNodeData {
  name: string;
  type: 'internal' | 'external';
  apiUrl?: string; // Optional for internal nodes, required for external
}

export interface UpdateNodeData {
  name?: string;
  apiUrl?: string; // Only editable for external nodes
  status?: 'active' | 'inactive' | 'pending';
}

export class NodeService {
  constructor(private db: Kysely<Database>) {}

  /**
   * Get a single node by ID
   */
  async get(context: UserContext, nodeId: number): Promise<NodeData> {
    const node = await this.db
      .selectFrom('nodes')
      .leftJoin('organizations', 'organizations.id', 'nodes.organizationId')
      .select([
        'nodes.id',
        'nodes.organizationId',
        'nodes.name',
        'nodes.type',
        'nodes.apiUrl',
        'nodes.status',
        'nodes.createdAt',
        'nodes.updatedAt',
        'organizations.name as organizationName',
      ])
      .where('nodes.id', '=', nodeId)
      .executeTakeFirst();

    if (!node) {
      throw new NotFoundError('Node not found');
    }

    // Check access
    const allowed =
      context.policies.includes('view-nodes-all-organizations') ||
      (context.policies.includes('view-nodes-own-organization') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view this node');
    }

    return node as NodeData;
  }

  /**
   * Create a new node
   */
  async create(
    context: UserContext,
    organizationId: number,
    data: CreateNodeData
  ): Promise<NodeData> {
    // Check access
    const allowed =
      context.policies.includes('edit-nodes-all-organizations') ||
      (context.policies.includes('edit-nodes-own-organization') &&
        context.organizationId === organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to create nodes for this organization');
    }

    // Validate input
    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestError('Node name is required');
    }

    if (!data.type || !['internal', 'external'].includes(data.type)) {
      throw new BadRequestError('Node type must be either "internal" or "external"');
    }

    // Determine API URL
    let apiUrl: string;
    if (data.type === 'internal') {
      // For internal nodes, generate API URL based on configuration
      // This will be set after we know the node ID, so we use a placeholder for now
      apiUrl = ''; // Will be updated after insert
    } else {
      // For external nodes, API URL is required
      if (!data.apiUrl || data.apiUrl.trim().length === 0) {
        throw new BadRequestError('API URL is required for external nodes');
      }
      apiUrl = data.apiUrl.trim();
    }

    // Insert the node
    const result = await this.db
      .insertInto('nodes')
      .values({
        organizationId,
        name: data.name.trim(),
        type: data.type,
        apiUrl: apiUrl,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // If internal node, update API URL with the node ID
    if (data.type === 'internal') {
      const baseUrl = config.FRONTEND_URL || 'https://directory.carbon-transparency.org';
      const generatedApiUrl = `${baseUrl}/api/nodes/${result.id}`;
      
      await this.db
        .updateTable('nodes')
        .set({ apiUrl: generatedApiUrl })
        .where('id', '=', result.id)
        .execute();

      result.apiUrl = generatedApiUrl;
    }

    return result as NodeData;
  }

  /**
   * Update a node
   */
  async update(
    context: UserContext,
    nodeId: number,
    data: UpdateNodeData
  ): Promise<NodeData> {
    // Get the existing node
    const existingNode = await this.get(context, nodeId);

    // Check access
    const allowed =
      context.policies.includes('edit-nodes-all-organizations') ||
      (context.policies.includes('edit-nodes-own-organization') &&
        context.organizationId === existingNode.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to update this node');
    }

    // Validate updates
    const updates: Partial<typeof existingNode> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new BadRequestError('Node name cannot be empty');
      }
      updates.name = data.name.trim();
    }

    if (data.status !== undefined) {
      if (!['active', 'inactive', 'pending'].includes(data.status)) {
        throw new BadRequestError('Invalid status value');
      }
      updates.status = data.status;
    }

    if (data.apiUrl !== undefined) {
      // Only external nodes can have their API URL updated
      if (existingNode.type === 'internal') {
        throw new BadRequestError('Cannot change API URL for internal nodes');
      }
      if (data.apiUrl.trim().length === 0) {
        throw new BadRequestError('API URL cannot be empty for external nodes');
      }
      updates.apiUrl = data.apiUrl.trim();
    }

    // Perform the update
    const updated = await this.db
      .updateTable('nodes')
      .set(updates)
      .where('id', '=', nodeId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return updated as NodeData;
  }

  /**
   * Delete a node (soft delete by setting status to inactive)
   */
  async delete(context: UserContext, nodeId: number): Promise<void> {
    // Get the existing node
    const existingNode = await this.get(context, nodeId);

    // Check access
    const allowed =
      context.policies.includes('edit-nodes-all-organizations') ||
      (context.policies.includes('edit-nodes-own-organization') &&
        context.organizationId === existingNode.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to delete this node');
    }

    // Soft delete by setting status to inactive
    await this.db
      .updateTable('nodes')
      .set({ 
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where('id', '=', nodeId)
      .execute();
  }

  /**
   * List nodes for a specific organization
   */
  async list(
    context: UserContext,
    organizationId: number,
    query: ListQuery = ListQuery.default()
  ): Promise<ListResult<NodeData>> {
    // Check access
    const allowed =
      context.policies.includes('view-nodes-all-organizations') ||
      (context.policies.includes('view-nodes-own-organization') &&
        context.organizationId === organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view nodes for this organization');
    }

    let qb = this.db
      .selectFrom('nodes')
      .leftJoin('organizations', 'organizations.id', 'nodes.organizationId')
      .select([
        'nodes.id',
        'nodes.organizationId',
        'nodes.name',
        'nodes.type',
        'nodes.apiUrl',
        'nodes.status',
        'nodes.createdAt',
        'nodes.updatedAt',
        'organizations.name as organizationName',
      ])
      .where('nodes.organizationId', '=', organizationId);

    // Apply filters
    if (query.filters) {
      if (query.filters.type) {
        const typeValue = query.filters.type as 'internal' | 'external';
        qb = qb.where('nodes.type', '=', typeValue);
      }
      if (query.filters.status) {
        const statusValue = query.filters.status as 'active' | 'inactive' | 'pending';
        qb = qb.where('nodes.status', '=', statusValue);
      }
    }
    if (query.search) {
      qb = qb.where('nodes.name', 'ilike', `%${query.search}%`);
    }

    // Get total count
    const total = (
      await qb
        .clearSelect()
        .select((eb) => eb.fn.count('nodes.id').as('total'))
        .executeTakeFirstOrThrow()
    ).total as number;

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const validSortFields = ['name', 'type', 'status', 'createdAt', 'updatedAt'];
    
    if (validSortFields.includes(sortBy)) {
      qb = qb.orderBy(`nodes.${sortBy}` as any, query.sortOrder || 'desc');
    } else {
      qb = qb.orderBy('nodes.createdAt', 'desc');
    }

    // Apply pagination
    const data = await qb.offset(query.offset).limit(query.limit).execute();

    return {
      data: data as NodeData[],
      pagination: query.pagination(total),
    };
  }

  /**
   * List all nodes (root only)
   */
  async listAll(
    context: UserContext,
    query: ListQuery = ListQuery.default()
  ): Promise<ListResult<NodeData>> {
    checkAccess(context, 'view-nodes-all-organizations');

    let qb = this.db
      .selectFrom('nodes')
      .leftJoin('organizations', 'organizations.id', 'nodes.organizationId')
      .select([
        'nodes.id',
        'nodes.organizationId',
        'nodes.name',
        'nodes.type',
        'nodes.apiUrl',
        'nodes.status',
        'nodes.createdAt',
        'nodes.updatedAt',
        'organizations.name as organizationName',
      ]);

    // Apply filters
    if (query.filters) {
      if (query.filters.type) {
        const typeValue = query.filters.type as 'internal' | 'external';
        qb = qb.where('nodes.type', '=', typeValue);
      }
      if (query.filters.status) {
        const statusValue = query.filters.status as 'active' | 'inactive' | 'pending';
        qb = qb.where('nodes.status', '=', statusValue);
      }
      if (query.filters.organizationId) {
        qb = qb.where('nodes.organizationId', '=', parseInt(query.filters.organizationId as string));
      }
    }
    if (query.search) {
      qb = qb.where((eb) =>
        eb.or([
          eb('nodes.name', 'ilike', `%${query.search}%`),
          eb('organizations.name', 'ilike', `%${query.search}%`),
        ])
      );
    }

    // Get total count
    const total = (
      await qb
        .clearSelect()
        .select((eb) => eb.fn.count('nodes.id').as('total'))
        .executeTakeFirstOrThrow()
    ).total as number;

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const validSortFields = ['name', 'type', 'status', 'createdAt', 'updatedAt', 'organizationId'];
    
    if (validSortFields.includes(sortBy)) {
      qb = qb.orderBy(`nodes.${sortBy}` as any, query.sortOrder || 'desc');
    } else {
      qb = qb.orderBy('nodes.createdAt', 'desc');
    }

    // Apply pagination
    const data = await qb.offset(query.offset).limit(query.limit).execute();

    return {
      data: data as NodeData[],
      pagination: query.pagination(total),
    };
  }
}
