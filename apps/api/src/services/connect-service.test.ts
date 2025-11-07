import { ConnectionService } from './connection-service';
import { OrganizationService } from './organization-service';
import { EmailService } from './email-service';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@src/common/errors';
import { Role } from '@src/common/policies';
import { createMockDatabase } from '../common/mock-utils';
import { UserContext } from './user-service';
import { ListQuery } from '@src/common/list-query';

describe('ConnectionService', () => {
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let organizationService: jest.Mocked<OrganizationService>;
  let emailService: jest.Mocked<EmailService>;
  let connectionService: ConnectionService;

  const regularUserContext: UserContext= {
    organizationId: 1,
    userId: 1,
    email: 'user@example.com',
    role: Role.User,
    policies: [],
    status: 'enabled',
  };

  const adminUserContext: UserContext = {
    organizationId: 1,
    userId: 1,
    email: 'admin@example.com',
    role: Role.Administrator,
    policies: ['view-connections-own-organization','edit-connections-own-organization'],
    status: 'enabled',
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // Create standardized database mocks
    dbMocks = createMockDatabase();

    organizationService = {
      get: jest.fn(),
      listSubOrganizations: jest.fn(),
    } as any;

    emailService = {
      sendConnectionRequestEmail: jest.fn(),
    } as any;

    connectionService = new ConnectionService(dbMocks.db as any, organizationService, emailService);
  });

  describe('listConnections', () => {
    it('should return connections', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValue([{ total: 1 }]);
      dbMocks.executors.execute.mockResolvedValue([{ id: 1 }]);
      const result = await connectionService.listConnections(adminUserContext, 1);
      expect(result.data).toEqual([{ id: 1 }]);
    });
  });

  describe('listConnectionRequests', () => {
    it('should return connection requests', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValue([{ total: 1 }]);
      dbMocks.executors.execute.mockResolvedValue([{ id: 1, status: 'pending' }]);
      const result = await connectionService.listConnectionRequests(adminUserContext, 1, ListQuery.parse({}));
      expect(dbMocks.executors.execute).toHaveBeenCalled();
      expect(result.data).toEqual([{ id: 1, status: 'pending' }]);
    });
  });

  describe('createConnectionRequest', () => {
    const requestedOrgId = 2;
    const requestingOrgId = 1;

    it('should throw BadRequestError if requestedOrganizationId is missing', async () => {
      await expect(
        connectionService.createConnectionRequest(adminUserContext, undefined as any, 1)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if requesting and requested orgs are same', async () => {
      await expect(
        connectionService.createConnectionRequest(adminUserContext, 1, 1)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw ForbiddenError if user is not Administrator', async () => {
      await expect(
        connectionService.createConnectionRequest(regularUserContext, 2, 1)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError if requesting org not found', async () => {
      organizationService.get.mockResolvedValueOnce(null as any);
      await expect(
        connectionService.createConnectionRequest(adminUserContext, 2, 1)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if requested org not found', async () => {
      organizationService.get
        .mockResolvedValueOnce({ id: 1, organizationName: 'Org1' } as any)
        .mockResolvedValueOnce(null as any);
      await expect(
        connectionService.createConnectionRequest(adminUserContext, 2, 1)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if not admin of own or sub organization', async () => {
      organizationService.get
        .mockResolvedValue({ id: 1, organizationName: 'Org1' } as any);
      organizationService.listSubOrganizations.mockResolvedValue([{ id: 99 }] as any);
      const otherContext = { ...adminUserContext, organizationId: 3 };

      await expect(
        connectionService.createConnectionRequest(otherContext, 2, 1)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should create connection request and send email', async () => {
      organizationService.get
        .mockResolvedValueOnce({ id: 1, organizationName: 'Org1' } as any)
        .mockResolvedValueOnce({ id: 2, organizationName: 'Org2' } as any);
      organizationService.listSubOrganizations.mockResolvedValue([{ id: 1 }] as any);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValue({
        id: 123,
        status: 'pending',
      });

      const result = await connectionService.createConnectionRequest(
        adminUserContext,
        requestedOrgId,
        requestingOrgId
      );

      expect(dbMocks.db.insertInto).toHaveBeenCalledWith('connection_requests');
      expect(emailService.sendConnectionRequestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com',
          name: 'Org2',
          organizationName: 'Org1',
        })
      );
      expect(result).toEqual({ id: 123, status: 'pending' });
    });
  });

  describe('acceptConnectionRequest', () => {
    it('should throw BadRequestError if requestId is missing', async () => {
      await expect(connectionService.acceptConnectionRequest(0 as any, 1)).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError if connection request not found', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);
      await expect(connectionService.acceptConnectionRequest(1, 1)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if current org does not match requestedCompanyId', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        requestedCompanyId: 2,
        requestingCompanyId: 3,
        createdAt: new Date(),
      });
      await expect(connectionService.acceptConnectionRequest(1, 1)).rejects.toThrow(ForbiddenError);
    });

    it('should accept connection request successfully', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        requestedCompanyId: 1,
        requestingCompanyId: 2,
        createdAt: new Date(),
      });
      dbMocks.transaction().execute.mockImplementation(async (fn: any) => await fn(dbMocks.db));

      await connectionService.acceptConnectionRequest(1, 1);

      expect(dbMocks.db.transaction).toHaveBeenCalled();
      expect(dbMocks.db.insertInto).toHaveBeenCalledWith('connections');
      expect(dbMocks.db.updateTable).toHaveBeenCalledWith('connection_requests');
    });
  });

  describe('rejectConnectionRequest', () => {
    it('should throw BadRequestError if requestId is missing', async () => {
      await expect(connectionService.rejectConnectionRequest(0 as any, 1)).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError if connection request not found', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);
      await expect(connectionService.rejectConnectionRequest(1, 1)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if current org does not match requestedCompanyId', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        requestedCompanyId: 2,
      });
      await expect(connectionService.rejectConnectionRequest(1, 1)).rejects.toThrow(ForbiddenError);
    });

    it('should reject connection request successfully', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        requestedCompanyId: 1,
      });
      dbMocks.transaction().execute.mockImplementation(async (fn: any) => await fn(dbMocks.db));

      await connectionService.rejectConnectionRequest(1, 1);

      expect(dbMocks.db.transaction).toHaveBeenCalled();
      expect(dbMocks.db.updateTable).toHaveBeenCalledWith('connection_requests');
    });
  });
});
