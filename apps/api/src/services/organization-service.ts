import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { NotFoundError, ForbiddenError } from '@src/common/errors';
import { registerPolicy, checkAccess } from '@src/common/policies';
import { UserContext, UserListData } from './user-service';
import { EmailService } from './email-service';
import config from '@src/common/config';

// Register all policies used in this service
registerPolicy('view-connections-own-organization');
registerPolicy('view-connections-all-organizations');
registerPolicy('view-own-organizations');
registerPolicy('edit-own-organizations');
registerPolicy('view-all-organizations');
registerPolicy('edit-all-organizations');

export interface OrganizationData {
  id: number;
  parentId: number | null;
  organizationName: string;
  organizationIdentifier: string | null;
  organizationDescription: string | null;
  networkKey: string | null;
  solutionApiUrl: string | null;
}

interface PagingParams {
  query?: string;
  page?: number;
  pageSize?: number;
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

    const organization = await this.db
      .selectFrom('organizations')
      .select([
        'id',
        'name as organizationName',
        'uri as organizationIdentifier',
        'description as organizationDescription',
        'networkKey',
        'solutionApiUrl',
        'parentId',
      ])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    return organization;
  }

  /**
   * List all organizations, optionally filter by a search query
   */
  async list(
    context: UserContext,
    paging?: PagingParams
  ): Promise<OrganizationData[]> {
    checkAccess(context, ['view-own-organizations', 'view-all-organizations']);

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
      ]);
    if (paging?.query) {
      qb = qb.where('name', 'ilike', `%${paging.query}%`);
    }
    if (paging?.page) {
      qb = qb
        .offset((paging.page - 1) * (paging.pageSize ?? 50))
        .limit(paging.pageSize ?? config.DEFAULT_PAGE_SIZE);
    }
    return qb.execute();
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
  async listSubOrganizations(parentId: number): Promise<OrganizationData[]> {
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
      ]);

    const companies = await qb.execute();
    return companies;
  }

  /**
   * Retrieves a list of user profiles who are members of the specified organization.
   *
   * @param organizationId - The unique identifier of the organization.
   * @returns A promise that resolves to an array of `UserContext` objects representing the organization's members.
   */
  async listMembers(
    context: UserContext,
    organizationId: number
  ): Promise<Omit<UserListData, 'password'>[]> {
    checkAccess(
      context,
      'view-own-organizations',
      context.organizationId === organizationId
    );
    const allowed =
      context.role === 'administrator' &&
      context.organizationId === organizationId;

    if (!allowed) {
      throw new ForbiddenError(
        'You are not allowed to view members of this organization'
      );
    }
    // join with organizations to get organization name
    const users = await this.db
      .selectFrom('users')
      .innerJoin('organizations', 'users.organizationId', 'organizations.id')
      .select([
        'users.id as id',
        'users.fullName as fullName',
        'users.email as email',
        'users.role as role',
        'organizations.name as organizationName',
        'organizations.id as organizationId',
        'organizations.uri as organizationIdentifier',
      ])
      .where('users.organizationId', '=', organizationId)
      .execute();

    return users;
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
  ): Promise<Omit<UserListData, 'password'>> {
    checkAccess(
      context,
      'view-own-organizations',
      context.organizationId === organizationId
    );
    const allowed =
      context.role === 'administrator' &&
      context.organizationId === organizationId;

    if (!allowed) {
      throw new ForbiddenError(
        'You are not allowed to view members of this organization'
      );
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
    update: { fullName?: string; role?: string }
  ): Promise<void> {
    checkAccess(
      context,
      'edit-own-organizations',
      context.organizationId === organizationId
    );
    const allowed =
      context.role === 'administrator' &&
      context.organizationId === organizationId;

    if (!allowed) {
      throw new ForbiddenError(
        'You are not allowed to edit members of this organization'
      );
    }

    const user = await this.db
      .selectFrom('users')
      .select(['id'])
      .where('id', '=', userId)
      .where('organizationId', '=', organizationId)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.db
      .updateTable('users')
      .set({
        ...(update.fullName && { fullName: update.fullName }),
        ...(update.role && { role: update.role }),
      })
      .where('id', '=', userId)
      .execute();
  }
}
