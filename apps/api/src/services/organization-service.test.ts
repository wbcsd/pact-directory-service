import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { NotFoundError, ForbiddenError } from '@src/common/errors';
import { Role } from '@src/common/policies';
import { UserContext } from './user-service';
import { EmailService } from './email-service';
import { OrganizationService } from './organization-service';

// Mock dependencies
jest.mock('@src/common/policies', () => ({
  registerPolicy: jest.fn(),
  checkAccess: jest.fn(),
  Role: {
    Administrator: 'administrator',
    Root: 'root',
    User: 'user',
  },
}));

jest.mock('@src/common/config', () => ({
  default: {
    DEFAULT_PAGE_SIZE: 50,
  },
}));

describe('OrganizationService', () => {
  let organizationService: OrganizationService;
  let mockDb: jest.Mocked<Kysely<Database>>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockQueryBuilder: any;

  const mockUserContext: UserContext = {
    userId: 1,
    organizationId: 1,
    role: Role.Administrator,
    policies: ['view-own-organizations', 'edit-own-organizations', 'view-all-organizations'],
    email: 'mock@user.com',
    status: 'enabled'
  };

  beforeEach(() => {
    // Create mock query builder
    mockQueryBuilder = {
      selectFrom: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      updateTable: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      withRecursive: jest.fn().mockReturnThis(),
      unionAll: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      executeTakeFirst: jest.fn(),
    };

    mockDb = {
      selectFrom: jest.fn().mockReturnValue(mockQueryBuilder),
      updateTable: jest.fn().mockReturnValue(mockQueryBuilder),
      withRecursive: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockEmailService = {} as jest.Mocked<EmailService>;

    organizationService = new OrganizationService(mockDb, mockEmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return organization when user has access', async () => {
      const mockOrganization = {
        id: 1,
        organizationName: 'Test Org',
        organizationIdentifier: 'test-org',
        organizationDescription: 'Test Description',
        networkKey: 'key123',
        solutionApiUrl: 'https://api.test.com',
        parentId: null,
      };

      mockQueryBuilder.executeTakeFirst.mockResolvedValue(mockOrganization);

      const result = await organizationService.get(mockUserContext, 1);

      expect(result).toEqual(mockOrganization);
      expect(mockDb.selectFrom).toHaveBeenCalledWith('organizations');
    });

    it('should throw ForbiddenError when user does not have access', async () => {
      const unauthorizedContext = {
        ...mockUserContext,
        organizationId: 2,
        policies: [],
      };

      await expect(
        organizationService.get(unauthorizedContext, 1)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when organization does not exist', async () => {
      mockQueryBuilder.executeTakeFirst.mockResolvedValue(undefined);

      await expect(organizationService.get(mockUserContext, 999)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should allow access when user has view-all-organizations policy', async () => {
      const adminContext = {
        ...mockUserContext,
        organizationId: 2,
        policies: ['view-all-organizations'],
      };

      const mockOrganization = {
        id: 1,
        organizationName: 'Test Org',
        organizationIdentifier: 'test-org',
        organizationDescription: 'Test Description',
        networkKey: 'key123',
        solutionApiUrl: 'https://api.test.com',
        parentId: null,
      };

      mockQueryBuilder.executeTakeFirst.mockResolvedValue(mockOrganization);

      const result = await organizationService.get(adminContext, 1);

      expect(result).toEqual(mockOrganization);
    });
  });

  describe('list', () => {
    it('should return list of organizations', async () => {
      const mockOrganizations = [
        {
          id: 1,
          organizationName: 'Org 1',
          organizationIdentifier: 'org-1',
          organizationDescription: 'Description 1',
          networkKey: 'key1',
          solutionApiUrl: 'https://api1.test.com',
          parentId: null,
        },
        {
          id: 2,
          organizationName: 'Org 2',
          organizationIdentifier: 'org-2',
          organizationDescription: 'Description 2',
          networkKey: 'key2',
          solutionApiUrl: 'https://api2.test.com',
          parentId: null,
        },
      ];

      mockQueryBuilder.execute.mockResolvedValue(mockOrganizations);

      const result = await organizationService.list(mockUserContext);

      expect(result).toEqual(mockOrganizations);
      expect(mockDb.selectFrom).toHaveBeenCalledWith('organizations');
    });

    it('should filter organizations by query', async () => {
      const mockOrganizations = [
        {
          id: 1,
          organizationName: 'Test Org',
          organizationIdentifier: 'test-org',
          organizationDescription: 'Description',
          networkKey: 'key1',
          solutionApiUrl: 'https://api.test.com',
          parentId: null,
        },
      ];

      mockQueryBuilder.execute.mockResolvedValue(mockOrganizations);

      const result = await organizationService.list(mockUserContext, {
        query: 'Test',
      });

      expect(result).toEqual(mockOrganizations);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('name', 'ilike', '%Test%');
    });

    it('should apply pagination', async () => {
      const mockOrganizations = [
        {
          id: 1,
          organizationName: 'Org 1',
          organizationIdentifier: 'org-1',
          organizationDescription: 'Description',
          networkKey: 'key1',
          solutionApiUrl: 'https://api.test.com',
          parentId: null,
        },
      ];

      mockQueryBuilder.execute.mockResolvedValue(mockOrganizations);

      const result = await organizationService.list(mockUserContext, {
        page: 2,
        pageSize: 10,
      });

      expect(result).toEqual(mockOrganizations);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('listSubOrganizations', () => {
    it('should return list of sub-organizations', async () => {
      const mockSubOrganizations = [
        {
          id: 1,
          organizationName: 'Parent Org',
          organizationIdentifier: 'parent-org',
          organizationDescription: 'Parent Description',
          networkKey: 'key1',
          solutionApiUrl: 'https://api.test.com',
          parentId: null,
        },
        {
          id: 2,
          organizationName: 'Child Org',
          organizationIdentifier: 'child-org',
          organizationDescription: 'Child Description',
          networkKey: 'key2',
          solutionApiUrl: 'https://api2.test.com',
          parentId: 1,
        },
      ];

      mockQueryBuilder.execute.mockResolvedValue(mockSubOrganizations);

      const result = await organizationService.listSubOrganizations(1);

      expect(result).toEqual(mockSubOrganizations);
      expect(mockDb.withRecursive).toHaveBeenCalledWith('children', expect.any(Function));
    });
  });

  describe('listMembers', () => {
    it('should return list of members when user is administrator', async () => {
      const mockMembers = [
        {
          id: 1,
          fullName: 'John Doe',
          email: 'john@test.com',
          role: Role.Administrator,
          status: 'enabled',
          organizationName: 'Test Org',
          organizationId: 1,
          organizationIdentifier: 'test-org',
        },
        {
          id: 2,
          fullName: 'Jane Smith',
          email: 'jane@test.com',
          role: Role.User,
          status: 'enabled',
          organizationName: 'Test Org',
          organizationId: 1,
          organizationIdentifier: 'test-org',
        },
      ];

      mockQueryBuilder.execute.mockResolvedValue(mockMembers);

      const result = await organizationService.listMembers(mockUserContext, 1);

      expect(result).toEqual(mockMembers);
      expect(mockDb.selectFrom).toHaveBeenCalledWith('users');
    });

    it('should throw ForbiddenError when user is not administrator', async () => {
      const userContext = {
        ...mockUserContext,
        role: Role.User,
      };

      await expect(
        organizationService.listMembers(userContext, 1)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when accessing different organization', async () => {
      await expect(
        organizationService.listMembers(mockUserContext, 2)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getMember', () => {
    it('should return member when user has access', async () => {
      const mockMember = {
        id: 2,
        fullName: 'Jane Smith',
        email: 'jane@test.com',
        role: Role.User,
        status: 'enabled',
        organizationName: 'Test Org',
        organizationId: 1,
        organizationIdentifier: 'test-org',
      };

      mockQueryBuilder.executeTakeFirst.mockResolvedValue(mockMember);

      const result = await organizationService.getMember(mockUserContext, 1, 2);

      expect(result).toEqual(mockMember);
      expect(mockDb.selectFrom).toHaveBeenCalledWith('users');
    });

    it('should throw NotFoundError when member does not exist', async () => {
      mockQueryBuilder.executeTakeFirst.mockResolvedValue(undefined);

      await expect(
        organizationService.getMember(mockUserContext, 1, 999)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user is not administrator', async () => {
      const userContext = {
        ...mockUserContext,
        role: Role.User,
      };

      await expect(
        organizationService.getMember(userContext, 1, 2)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('updateMember', () => {
    it('should update member successfully', async () => {
      mockQueryBuilder.executeTakeFirst.mockResolvedValue({ id: 2 });
      mockQueryBuilder.execute
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]) // admin count
        .mockResolvedValueOnce(undefined); // update result

      const result = await organizationService.updateMember(
        mockUserContext,
        1,
        2,
        { fullName: 'Updated Name', role: Role.User }
      );

      expect(result).toEqual({ message: 'User updated successfully' });
      expect(mockDb.updateTable).toHaveBeenCalledWith('users');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockQueryBuilder.executeTakeFirst.mockResolvedValue(undefined);

      await expect(
        organizationService.updateMember(mockUserContext, 1, 999, {
          fullName: 'Updated Name',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when trying to change last administrator role', async () => {
      mockQueryBuilder.executeTakeFirst.mockResolvedValue({ id: 1 });
      mockQueryBuilder.execute.mockResolvedValue([{ id: 1 }]); // only one admin

      await expect(
        organizationService.updateMember(mockUserContext, 1, 1, {
          role: Role.User,
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when user is not administrator', async () => {
      const userContext = {
        ...mockUserContext,
        role: Role.User,
      };

      await expect(
        organizationService.updateMember(userContext, 1, 2, {
          fullName: 'Updated Name',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow role change when there are multiple administrators', async () => {
      mockQueryBuilder.executeTakeFirst.mockResolvedValue({ id: 2 });
      mockQueryBuilder.execute
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]) // two admins
        .mockResolvedValueOnce(undefined); // update result

      const result = await organizationService.updateMember(
        mockUserContext,
        1,
        2,
        { role: Role.User }
      );

      expect(result).toEqual({ message: 'User updated successfully' });
    });

    it('should update only fullName when role is not provided', async () => {
      mockQueryBuilder.executeTakeFirst.mockResolvedValue({ id: 2 });
      mockQueryBuilder.execute.mockResolvedValue(undefined);

      const result = await organizationService.updateMember(
        mockUserContext,
        1,
        2,
        { fullName: 'Updated Name' }
      );

      expect(result).toEqual({ message: 'User updated successfully' });
      expect(mockDb.updateTable).toHaveBeenCalledWith('users');
    });
  });
});