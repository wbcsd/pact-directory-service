import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { ConnectionService } from './connection-service';
import { OrganizationService } from './organization-service';
import { EmailService } from './email-service';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@src/common/errors';
import { checkAccess, Role } from '@src/common/policies';

// Mock dependencies
jest.mock('@src/common/policies', () => ({
  checkAccess: jest.fn(),
  Role: { Administrator: 'Administrator', User: 'User' },
}));

describe('ConnectionService', () => {
  let db: any;
  let organizationService: jest.Mocked<OrganizationService>;
  let emailService: jest.Mocked<EmailService>;
  let connectionService: ConnectionService;

  const mockExecute = jest.fn();
  const mockExecuteTakeFirst = jest.fn();
  const mockExecuteTakeFirstOrThrow = jest.fn();
  const mockTransactionExecute = jest.fn();
  const mockInsertInto = jest.fn();
  const mockUpdateTable = jest.fn();

  const context = {
    organizationId: 1,
    email: 'admin@example.com',
    role: Role.Administrator,
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // Mock DB query chain
    db = {
      selectFrom: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: mockExecute,
      executeTakeFirst: mockExecuteTakeFirst,
      executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
      insertInto: mockInsertInto.mockReturnThis(),
      updateTable: mockUpdateTable.mockReturnThis(),
      returningAll: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      transaction: jest.fn().mockReturnValue({
        execute: mockTransactionExecute,
      }),
    };

    organizationService = {
      get: jest.fn(),
      listSubOrganizations: jest.fn(),
    } as any;

    emailService = {
      sendConnectionRequestEmail: jest.fn(),
    } as any;

    connectionService = new ConnectionService(db, organizationService, emailService);
  });

  describe('listConnections', () => {
    it('should call checkAccess twice and return connections', async () => {
      mockExecute.mockResolvedValue([{ id: 1 }]);
      const result = await connectionService.listConnections(context as any, 1);
      expect(checkAccess).toHaveBeenCalledTimes(2);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('listConnectionRequests', () => {
    it('should return connection requests', async () => {
      mockExecute.mockResolvedValue([{ id: 1, status: 'pending' }]);
      const result = await connectionService.listConnectionRequests(context as any, 1);
      expect(mockExecute).toHaveBeenCalled();
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
      mockExecuteTakeFirstOrThrow.mockResolvedValue({
        id: 123,
        status: 'pending',
      });

      const result = await connectionService.createConnectionRequest(
        context as any,
        requestedOrgId,
        requestingOrgId
      );

      expect(db.insertInto).toHaveBeenCalledWith('connection_requests');
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
      mockExecuteTakeFirst.mockResolvedValueOnce(null);
      await expect(connectionService.acceptConnectionRequest(1, 1)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if current org does not match requestedCompanyId', async () => {
      mockExecuteTakeFirst.mockResolvedValueOnce({
        id: 1,
        requestedCompanyId: 2,
        requestingCompanyId: 3,
        createdAt: new Date(),
      });
      await expect(connectionService.acceptConnectionRequest(1, 1)).rejects.toThrow(ForbiddenError);
    });

    it('should accept connection request successfully', async () => {
      mockExecuteTakeFirst.mockResolvedValueOnce({
        id: 1,
        requestedCompanyId: 1,
        requestingCompanyId: 2,
        createdAt: new Date(),
      });
      mockTransactionExecute.mockImplementation(async (fn: any) => await fn(db));

      await connectionService.acceptConnectionRequest(1, 1);

      expect(db.transaction).toHaveBeenCalled();
      expect(mockInsertInto).toHaveBeenCalledWith('connections');
      expect(mockUpdateTable).toHaveBeenCalledWith('connection_requests');
    });
  });

  describe('rejectConnectionRequest', () => {
    it('should throw BadRequestError if requestId is missing', async () => {
      await expect(connectionService.rejectConnectionRequest(0 as any, 1)).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError if connection request not found', async () => {
      mockExecuteTakeFirst.mockResolvedValueOnce(null);
      await expect(connectionService.rejectConnectionRequest(1, 1)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if current org does not match requestedCompanyId', async () => {
      mockExecuteTakeFirst.mockResolvedValueOnce({
        id: 1,
        requestedCompanyId: 2,
      });
      await expect(connectionService.rejectConnectionRequest(1, 1)).rejects.toThrow(ForbiddenError);
    });

    it('should reject connection request successfully', async () => {
      mockExecuteTakeFirst.mockResolvedValueOnce({
        id: 1,
        requestedCompanyId: 1,
      });
      mockTransactionExecute.mockImplementation(async (fn: any) => await fn(db));

      await connectionService.rejectConnectionRequest(1, 1);

      expect(db.transaction).toHaveBeenCalled();
      expect(mockUpdateTable).toHaveBeenCalledWith('connection_requests');
    });
  });
});
