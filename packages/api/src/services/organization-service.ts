import { Kysely, sql } from 'kysely';
import { Database } from '@src/database/types';
import { NotFoundError, ForbiddenError } from '@src/common/errors';
import { registerPolicy, checkAccess, Role, hasAccess } from '@src/common/policies';
import { UserContext, UserData, UserStatus } from './user-service';
import { EmailService } from './email-service';
import { ListQuery, ListResult } from '@src/common/list-query';

// Register all policies used in this service
registerPolicy([Role.Administrator], 'view-connections-own-organization');
registerPolicy([Role.Administrator], 'edit-connections-own-organization');
registerPolicy([Role.Administrator], 'view-own-organizations');
registerPolicy([Role.Administrator], 'edit-own-organizations');
registerPolicy([Role.Root], 'view-connections-all-organizations');
registerPolicy([Role.Root], 'edit-connections-all-organizations');
registerPolicy([Role.Root], 'view-all-organizations');
registerPolicy([Role.Root], 'edit-all-organizations');
registerPolicy([Role.Root], 'assign-root-role');

export interface OrganizationData {
  id: number;
  parentId: number | null;
  organizationName: string;
  organizationIdentifier: string | null;
  organizationDescription: string | null;
  networkKey: string | null;
  solutionApiUrl: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  status: 'active' | 'disabled';
}


export class OrganizationService {
  constructor(
    private db: Kysely<Database>,
    private emailService: EmailService
  ) {}

  /**
   * Get a organization
   */
  async get(context: UserContext, id: number): Promise<OrganizationData> {
    const allowed =
      context.organizationId === id ||
      context.policies?.includes('view-all-organizations');
    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view this organization');
    }

    let qb = this.db
        .selectFrom('organizations')
        .select([
          'id',
          'name as organizationName',
          'uri as organizationIdentifier',
          'description as organizationDescription',
          'networkKey',
          'solutionApiUrl',
          'parentId',
          'status',
        ]);

        // Include credentials for own organization
    if (context.organizationId === id) {
      qb = qb.select([
        'clientId',
        'clientSecret'
      ]);
    }
    qb = qb.where('id', '=', id);

    const organization = await qb.executeTakeFirst();
    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    return organization;
  }

  /**
   * Update an organization
   */
  async update(
    context: UserContext,
    id: number,
    update: {
      organizationName?: string;
      organizationDescription?: string;
      solutionApiUrl?: string;
      status?: 'active' | 'disabled';
    }
  ): Promise<{ message: string }> {
    checkAccess(context, ['edit-own-organizations', 'edit-all-organizations']);

    // Only root can edit other organizations
    if (context.organizationId !== id && !hasAccess(context, 'edit-all-organizations')) {
      throw new ForbiddenError('You are not allowed to edit this organization');
    }

    const organization = await this.db
      .selectFrom('organizations')
      .select(['id'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    await this.db
      .updateTable('organizations')
      .set({
        ...(update.organizationName && { name: update.organizationName }),
        ...(update.organizationDescription && { description: update.organizationDescription }),
        ...(update.solutionApiUrl && { solutionApiUrl: update.solutionApiUrl }),
        ...(update.status && { status: update.status }),
      })
      .where('id', '=', id)
      .execute();

    return {
      message: 'Organization updated successfully',
    };
  }

  /**
   * List all organizations with pagination, filtering, and sorting
   */
  async list(
    context: UserContext,
    query: ListQuery
  ): Promise<ListResult<OrganizationData & { userCount: string | number | bigint, lastActivity: Date | null }>> {
    checkAccess(context, ['view-own-organizations', 'view-all-organizations']);

  let qb = this.db
    .selectFrom('organizations')
    .leftJoin('users', 'users.organizationId', 'organizations.id')
    .select([
      'organizations.id',
      'organizations.name as organizationName',
      'organizations.uri as organizationIdentifier',
      'organizations.description as organizationDescription',
      'organizations.solutionApiUrl',
      'organizations.networkKey',
      'organizations.parentId',
      'organizations.status',
      (eb) => eb.fn.count('users.id').as('userCount'),
      (eb) => eb.fn.max('users.lastLogin').as('lastActivity')
    ])
    .groupBy([
      'organizations.id',
      'organizations.name',
      'organizations.uri',
      'organizations.description',
      'organizations.solutionApiUrl',
      'organizations.networkKey',
      'organizations.parentId',
      'organizations.status',
    ]);

    // If user doesn't have view-all-organizations, restrict to their own organization
    if (!context.policies.includes('view-all-organizations')) {
      qb = qb.where('organizations.id', '=', context.organizationId);
    }
    
    // Apply search filter
    if (query.search) {
      qb = qb.where('name', 'ilike', `%${query.search}%`);
    }


    // Get total count for pagination
    const total = Number(
      (await this.db
        .selectFrom('organizations')
        .select((eb) => eb.fn.countAll().as('total'))
        .$if(!context.policies.includes('view-all-organizations'), (qb) =>
          qb.where('organizations.id', '=', context.organizationId)
        )
        .$if(!!query.search, (qb) =>
          qb.where('name', 'ilike', `%${query.search}%`)
        )
        .executeTakeFirstOrThrow()
      ).total
    );

    // Apply sorting
    if (query.sortBy && query.sortBy in ['name','uri']) {
      qb = qb.orderBy(query.sortBy as any, query.sortOrder ?? 'asc');
    } else {
      // Default sorting by name
      qb = qb.orderBy('organizations.name', 'asc');
    }

    // Apply pagination
    const data = await qb.offset(query.offset).limit(query.limit).execute();

    // Return data with pagination information
    return {
      data,
      pagination: query.pagination(total)
    };
  }

  /**
   * List all (sub)organizations
   */
  /**
   * Retrieves a list of all sub-organizations (including nested children) for a given parent organization.
   *
   * This method uses a recursive SQL query to traverse the organization hierarchy,
   * starting from the specified `parentId`, and collects all descendant organizations.
   *
   * @param parentId - The ID of the parent organization whose sub-organizations are to be listed.
   * @returns A promise that resolves to an array of `CompanyData` objects representing the sub-organizations.
   */
  async listSubOrganizations(context: UserContext, parentId: number): Promise<OrganizationData[]> {
    // Check access rights, user must have view-all-organizations policy or
    // view-own-organizations policy and belong to the parent organization
    const allowed = context.policies.includes('view-all-organizations') ||
                    (context.policies.includes('view-own-organizations') && context.organizationId === parentId);
    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view sub-organizations of this organization');
    }
    const qb = this.db
      .withRecursive('children', (db) =>
        db
          .selectFrom('organizations')
          .where('id', '=', parentId)
          .selectAll()
          .unionAll(
            db
              .selectFrom('organizations')
              .innerJoin('children', 'organizations.parentId', 'children.id')
              .selectAll('organizations')
          )
      )
      .selectFrom('children')
      .select([
        'id',
        'name as organizationName',
        'uri as organizationIdentifier',
        'description as organizationDescription',
        'networkKey',
        'solutionApiUrl',
        'parentId',
        'status',
      ]);

    const companies = await qb.execute();
    return companies;
  }

  /**
   * Retrieves a list of user profiles who are members of the specified organization.
   *
   * @param organizationId - The unique identifier of the organization.
   * @param query - Query parameters for filtering, sorting, and pagination
   * @returns A promise that resolves to paginated list of organization members.
   */
  async listMembers(
    context: UserContext,
    organizationId: number,
    query: ListQuery
  ): Promise<ListResult<UserData>> {
    // Check that user has view-all-organizations policy or 
    // view-own-organizations for members in their own organization
    const allowed = 
      context.policies.includes('view-all-organizations') ||
      context.policies.includes('view-own-organizations') && context.organizationId === organizationId;

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view members of this organization');
    }
    // join with organizations to get organization name
    let qb = this.db
      .selectFrom('users')
      .innerJoin('organizations', 'users.organizationId', 'organizations.id')
      .select([
        'users.id as id',
        'users.fullName as fullName',
        'users.email as email',
        'users.role as role',
        'users.status as status',
        'users.lastLogin as lastLogin',
        'organizations.name as organizationName',
        'organizations.id as organizationId',
        'organizations.uri as organizationIdentifier',
      ]);

    // Apply search filter
    if (query?.search) {
      qb = qb.where((eb) =>
        eb.or([
          eb('users.fullName', 'ilike', `%${query.search}%`),
          eb('users.email', 'ilike', `%${query.search}%`)
        ])
      );
    }

    // Restrict to the specified organization if role < root
    if (!hasAccess(context, 'view-all-organizations')) {
      qb = qb.where('users.organizationId', '=', context.organizationId);
    } 

    // Get total count for pagination
    const total = (
      await qb.clearSelect()
        .select((eb) => eb.fn.count('users.id').as('total'))
        .executeTakeFirstOrThrow()
    ).total as number;

    // Apply sorting
    if (query?.sortBy && query.sortBy in ['email','fullName','role','status']) {
      qb = qb.orderBy(`users.${query.sortBy}` as any, query.sortOrder ?? 'asc');
    } else {
      // Default sorting by full name
      qb = qb.orderBy('users.fullName', 'asc');
    }

    // Apply pagination and get data
    const data = await qb.offset(query.offset).limit(query.limit).execute();

    return {
      data,
      pagination: query.pagination(total)
    };
  }

  /**
   * Retrieves a list of user profiles who are members of the specified organization.
   *
   * @param organizationId - The unique identifier of the organization.
   * @returns A promise that resolves to an array of `UserContext` objects representing the organization's members.
   */
  async getMember(
    context: UserContext,
    organizationId: number,
    userId: number
  ): Promise<UserData> {
    // Check that user has view-all-organizations policy or 
    // view-own-organizations for members in their own organization
    const allowed = 
      context.policies.includes('view-all-organizations') ||
      context.policies.includes('view-own-organizations') && context.organizationId === organizationId;
    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view members of this organization');
    }
    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view members of this organization');
    }
    // join with organizations to get organization name
    const user = await this.db
      .selectFrom('users')
      .innerJoin('organizations', 'users.organizationId', 'organizations.id')
      .select([
        'users.id as id',
        'users.fullName as fullName',
        'users.email as email',
        'users.role as role',
        'users.status as status',
        'organizations.name as organizationName',
        'organizations.id as organizationId',
        'organizations.uri as organizationIdentifier',
      ])
      .where('users.id', '=', userId)
      .where('users.organizationId', '=', organizationId)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  // Update user
  async updateMember(
    context: UserContext,
    organizationId: number,
    userId: number,
    update: { fullName?: string; role?: Role, status?: UserStatus }
  ): Promise<{ message: string }> {
    // Check that user has edit-all-organizations policy or 
    // view-own-organizations for members in their own organization
    const allowed = 
      context.policies.includes('edit-all-organizations') ||
      context.policies.includes('edit-own-organizations') && context.organizationId === organizationId;

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to edit members of this organization');
    }

    const user = await this.db
      .selectFrom('users')
      .select(['id', 'status'])
      .where('id', '=', userId)
      .where('organizationId', '=', organizationId)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (update.role === Role.Root) {
      // Only root users can assign root role
      if (!hasAccess(context, 'assign-root-role')) {
        throw new ForbiddenError('You are not allowed to assign root role');
      }
    }

    // Can only enable a user that is currently disabled
    if (update.status === 'enabled' && user?.status !== 'disabled') {
      throw new ForbiddenError('Can only enable a disabled user');
    }

    if (update.status === 'disabled') {
      // Only allow disabling if the user was enabled before
      if (user?.status !== 'enabled') {
        throw new ForbiddenError('Can only disable an enabled user');
      }

      // If this user is the last one that's enabled, prevent disabling
      const enabledCount = await this.db
        .selectFrom('users')
        .where('organizationId', '=', organizationId)
        .where('status', '=', 'enabled')
        .select(['id'])
        .execute();

      if (enabledCount.length <= 1) {
        const isLastEnabled = enabledCount.some((u) => u.id === userId);
        if (isLastEnabled) {
          throw new ForbiddenError(
            'Cannot disable the last enabled user in the organization'
          );
        }
      }
    }

    // If this user is the last administrator, prevent role change
    if (update.role && update.role !== Role.Administrator) {
      const adminCount = await this.db
        .selectFrom('users')
        .where('organizationId', '=', organizationId)
        .where('status', '=', 'enabled')
        .where('role', '=', Role.Administrator)
        .select(['id'])
        .execute();

      if (adminCount.length <= 1) {
        const isLastAdmin = adminCount.some((admin) => admin.id === userId);
        if (isLastAdmin) {
          throw new ForbiddenError(
            'Cannot change role of the last administrator in the organization'
          );
        }
      }
    }

    await this.db
      .updateTable('users')
      .set({
        ...(update.fullName && { fullName: update.fullName }),
        ...(update.role && { role: update.role }),
        ...(update.status && { status: update.status }),
      })
      .where('id', '=', userId)
      .execute();

    return {
      message: 'User updated successfully',
    };
  }

    /**
   * Check if an organization exists by its name, using a case-insensitive match
   */
  async checkOrganizationExistsByName(
    organizationName: string
  ): Promise<{ organizationName: string; exists: boolean }> {
    const organization = await this.db
      .selectFrom('organizations')
      .select('id')
      .where(sql`lower(name)`, '=', organizationName.toLowerCase())
      .executeTakeFirst();

    return { organizationName, exists: Boolean(organization) };
  }
}
