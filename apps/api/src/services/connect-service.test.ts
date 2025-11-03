import { ConnectionService } from './connection-service';
import { OrganizationService } from './organization-service';
import { EmailService } from './email-service';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@src/common/errors';
import { checkAccess, Role } from '@src/common/policies';
import { createMockDatabase } from '../common/mock-utils';

// Mock dependencies
jest.mock('@src/common/policies', () => ({
  checkAccess: jest.fn(),
  Role: { Administrator: 'Administrator', User: 'User' },
}));

describe('ConnectionService', () => {
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let organizationService: jest.Mocked<OrganizationService>;
  let emailService: jest.Mocked<EmailService>;
  let connectionService: ConnectionService;

  const context = {
    organizationId: 1,
    email: 'admin@example.com',
    role: Role.Administrator,
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
    it('should call checkAccess twice and return connections', async () => {
      dbMocks.executors.execute.mockResolvedValue([{ id: 1 }]);
      const result = await connectionService.listConnections(context as any, 1);
      expect(checkAccess).toHaveBeenCalledTimes(2);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('listConnectionRequests', () => {
    it('should return connection requests', async () => {
      dbMocks.executors.execute.mockResolvedValue([{ id: 1, status: 'pending' }]);
      const result = await connectionService.listConnectionRequests(context as any, 1);
      expect(dbMocks.executors.execute).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, status: 'pending' }]);
    });
  });

  describe('createConnectionRequest', () => {
    const requestedOrgId = 2;
    const requestingOrgId = 1;

    it('should throw BadRequestError if requestedOrganizationId is missing', async () => {
      await expect(
        connectionService.createConnectionRequest(context as any, undefined as any, 1)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if requesting and requested orgs are same', async () => {
      await expect(
        connectionService.createConnectionRequest(context as any, 1, 1)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw ForbiddenError if user is not Administrator', async () => {
      const nonAdminCtx = { ...context, role: Role.User };
      await expect(
        connectionService.createConnectionRequest(nonAdminCtx as any, 2, 1)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError if requesting org not found', async () => {
      organizationService.get.mockResolvedValueOnce(null as any);
      await expect(
        connectionService.createConnectionRequest(context as any, 2, 1)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if requested org not found', async () => {
      organizationService.get
        .mockResolvedValueOnce({ id: 1, organizationName: 'Org1' } as any)
        .mockResolvedValueOnce(null as any);
      await expect(
        connectionService.createConnectionRequest(context as any, 2, 1)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if not admin of own or sub organization', async () => {
      organizationService.get
        .mockResolvedValue({ id: 1, organizationName: 'Org1' } as any);
      organizationService.listSubOrganizations.mockResolvedValue([{ id: 99 }] as any);
      const otherContext = { ...context, organizationId: 3 };

      await expect(
        connectionService.createConnectionRequest(otherContext as any, 2, 1)
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
        context as any,
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
