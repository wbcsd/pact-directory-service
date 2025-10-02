import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { NotFoundError } from '@src/common/errors';
import { UserProfile } from './user-service';
import { EmailService } from './email-service';


export interface OrganizationData {
  id: number;
  parentId: number | null;
  organizationName: string;
  organizationIdentifier: string | null;
  organizationDescription: string | null;
  networkKey: string | null;
  solutionApiUrl: string | null;
}

export class OrganizationService {

  constructor(
    private db: Kysely<Database>,
    private emailService: EmailService
  ) {}

  /**
   * Get a organization
   */
  async get(id: number): Promise<OrganizationData> {

    const company = await this.db
      .selectFrom('organizations')
      .select([
        'id',
        'name as organizationName',
        'uri as organizationIdentifier',
        'description as organizationDescription',
        'networkKey',
        'solutionApiUrl',
        'parentId'
      ])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!company) {
      throw new NotFoundError('Organization not found');
    }

    return company;
  }

  /**
   * List all organizations, optionally filter by a search query
   */
  async list(query?: string): Promise<OrganizationData[]> {
    let qb = this.db
      .selectFrom('organizations')
      .select([
        'id',
        'name as organizationName',
        'uri as organizationIdentifier',
        'description as organizationDescription',
        'networkKey',
        'solutionApiUrl',
        'parentId'
      ]);
    if (query) {
      qb = qb.where('name', 'ilike', `%${query}%`);
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
        'parentId'
      ]);
      
    const companies = await qb.execute();
    return companies;
  }

  /**
   * Retrieves a list of user profiles who are members of the specified organization.
   *
   * @param organizationId - The unique identifier of the organization.
   * @returns A promise that resolves to an array of `UserProfile` objects representing the organization's members.
   */
  async listMembers(organizationId: number): Promise<UserProfile[]> {
    const users = await this.db
      .selectFrom('users as u')
      .innerJoin('organizations as o', 'u.organizationId', 'o.id')
      .select([
        'u.id as userId',
        'u.fullName',
        'u.email',
        'u.role',
        'o.id as organizationId',
        'o.name as organizationName',
        'o.uri as organizationIdentifier',
      ])
      .where('o.id', '=', organizationId)
      .execute();
    return users;
  }
}
