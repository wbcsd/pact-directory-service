import { NodeConnectionService } from './node-connection-service';
import { NodeService } from './node-service';
import { EmailService } from './email-service';
import { BadRequestError, NotFoundError, ForbiddenError } from '@src/common/errors';
import { Role } from '@src/common/policies';
import { createMockDatabase } from '../common/mock-utils';
import { UserContext } from './user-service';
import { ListQuery } from '@src/common/list-query';

describe('NodeConnectionService', () => {
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let nodeService: jest.Mocked<NodeService>;
  let emailService: jest.Mocked<EmailService>;
  let connectionService: NodeConnectionService;

  const adminUserContext: UserContext = {
    organizationId: 1,
    userId: 1,
    email: 'admin@example.com',
    role: Role.Administrator,
    policies: ['manage-connections-own-nodes'],
    status: 'enabled',
  };

  const rootUserContext: UserContext = {
    organizationId: 1,
    userId: 2,
    email: 'root@example.com',
    role: Role.Root,
    policies: ['manage-connections-all-nodes'],
    status: 'enabled',
  };

  const regularUserContext: UserContext = {
    organizationId: 1,
    userId: 3,
    email: 'user@example.com',
    role: Role.User,
    policies: [],
    status: 'enabled',
  };

  beforeEach(() => {
    dbMocks = createMockDatabase();
    nodeService = {
      get: jest.fn(),
    } as any;
    emailService = {
      sendConnectionRequestEmail: jest.fn(),
    } as any;
    connectionService = new NodeConnectionService(
      dbMocks.db as any,
      nodeService,
      emailService
    );
  });

  describe('createInvitation', () => {
    it('should throw BadRequestError if nodes are the same', async () => {
      await expect(
        connectionService.createInvitation(adminUserContext, {
          fromNodeId: 1,
          targetNodeId: 1,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw ForbiddenError if user does not have permission', async () => {
      nodeService.get
        .mockResolvedValueOnce({
          id: 1,
          organizationId: 2, // Different org
          name: 'Node 1',
          type: 'internal',
          apiUrl: 'http://example.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .mockResolvedValueOnce({
          id: 2,
          organizationId: 3,
          name: 'Node 2',
          type: 'internal',
          apiUrl: 'http://example2.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      await expect(
        connectionService.createInvitation(adminUserContext, {
          fromNodeId: 1,
          targetNodeId: 2,
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError if connection already exists', async () => {
      nodeService.get
        .mockResolvedValueOnce({
          id: 1,
          organizationId: 1,
          name: 'Node 1',
          type: 'internal',
          apiUrl: 'http://example.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .mockResolvedValueOnce({
          id: 2,
          organizationId: 2,
          name: 'Node 2',
          type: 'internal',
          apiUrl: 'http://example2.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        fromNodeId: 1,
        targetNodeId: 2,
        status: 'accepted',
      });

      await expect(
        connectionService.createInvitation(adminUserContext, {
          fromNodeId: 1,
          targetNodeId: 2,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should create invitation successfully', async () => {
      nodeService.get
        .mockResolvedValueOnce({
          id: 1,
          organizationId: 1,
          organizationName: 'Org 1',
          name: 'Node 1',
          type: 'internal',
          apiUrl: 'http://example.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .mockResolvedValueOnce({
          id: 2,
          organizationId: 2,
          name: 'Node 2',
          type: 'internal',
          apiUrl: 'http://example2.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null); // No existing connection

      const mockConnection = {
        id: 1,
        fromNodeId: 1,
        targetNodeId: 2,
        clientId: 'test-client-id',
        clientSecret: 'encrypted-secret',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      };

      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockConnection);

      const result = await connectionService.createInvitation(adminUserContext, {
        fromNodeId: 1,
        targetNodeId: 2,
      });

      expect(result.status).toBe('pending');
      expect(result.fromNodeId).toBe(1);
      expect(result.targetNodeId).toBe(2);
      expect(emailService.sendConnectionRequestEmail).toHaveBeenCalled();
    });
  });

  describe('listInvitations', () => {
    it('should throw ForbiddenError if user does not have permission', async () => {
      nodeService.get.mockResolvedValueOnce({
        id: 1,
        organizationId: 2, // Different org
        name: 'Node 1',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(
        connectionService.listInvitations(adminUserContext, 1, ListQuery.default())
      ).rejects.toThrow(ForbiddenError);
    });

    it('should return list of pending invitations', async () => {
      nodeService.get.mockResolvedValueOnce({
        id: 1,
        organizationId: 1,
        name: 'Node 1',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const mockInvitations = [
        {
          id: 1,
          fromNodeId: 2,
          targetNodeId: 1,
          clientId: 'client-1',
          clientSecret: 'secret-1',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: null,
        },
      ];

      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce(mockInvitations);

      const result = await connectionService.listInvitations(
        adminUserContext,
        1,
        ListQuery.default()
      );

      expect(result.data).toEqual(mockInvitations);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('acceptInvitation', () => {
    it('should throw NotFoundError if invitation not found', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(connectionService.acceptInvitation(adminUserContext, 999)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ForbiddenError if user does not have permission', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        fromNodeId: 2,
        targetNodeId: 3,
        clientId: 'client-1',
        clientSecret: 'secret-1',
        status: 'pending',
      });

      nodeService.get.mockResolvedValueOnce({
        id: 3,
        organizationId: 2, // Different org
        name: 'Node 3',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(connectionService.acceptInvitation(adminUserContext, 1)).rejects.toThrow(
        ForbiddenError
      );
    });

    it('should accept invitation and return credentials', async () => {
      const mockInvitation = {
        id: 1,
        fromNodeId: 2,
        targetNodeId: 3,
        clientId: 'client-1',
        clientSecret: Buffer.from('secret-1').toString('base64'),
        status: 'pending',
      };

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockInvitation);

      nodeService.get.mockResolvedValueOnce({
        id: 3,
        organizationId: 1,
        name: 'Node 3',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      const result = await connectionService.acceptInvitation(adminUserContext, 1);

      expect(result.connectionId).toBe(1);
      expect(result.clientId).toBe('client-1');
      expect(result.clientSecret).toBe('secret-1');
      expect(dbMocks.db.updateTable).toHaveBeenCalledWith('connections');
    });
  });

  describe('rejectInvitation', () => {
    it('should throw NotFoundError if invitation not found', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(connectionService.rejectInvitation(adminUserContext, 999)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should reject invitation successfully', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        fromNodeId: 2,
        targetNodeId: 3,
        clientId: 'client-1',
        clientSecret: 'secret-1',
        status: 'pending',
      });

      nodeService.get.mockResolvedValueOnce({
        id: 3,
        organizationId: 1,
        name: 'Node 3',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      await connectionService.rejectInvitation(adminUserContext, 1);

      expect(dbMocks.db.updateTable).toHaveBeenCalledWith('connections');
      expect(dbMocks.queryChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'rejected' })
      );
    });
  });

  describe('listConnections', () => {
    it('should return list of accepted connections', async () => {
      nodeService.get.mockResolvedValueOnce({
        id: 1,
        organizationId: 1,
        name: 'Node 1',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const mockConnections = [
        {
          id: 1,
          fromNodeId: 1,
          targetNodeId: 2,
          clientId: 'client-1',
          clientSecret: 'secret-1',
          status: 'accepted',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(),
        },
      ];

      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce(mockConnections);

      const result = await connectionService.listConnections(
        adminUserContext,
        1,
        ListQuery.default()
      );

      expect(result.data).toEqual(mockConnections);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('removeConnection', () => {
    it('should throw NotFoundError if connection not found', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(connectionService.removeConnection(adminUserContext, 999)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ForbiddenError if user does not have permission', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        fromNodeId: 2,
        targetNodeId: 3,
      });

      nodeService.get
        .mockResolvedValueOnce({
          id: 2,
          organizationId: 2,
          name: 'Node 2',
          type: 'internal',
          apiUrl: 'http://example.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .mockResolvedValueOnce({
          id: 3,
          organizationId: 3,
          name: 'Node 3',
          type: 'internal',
          apiUrl: 'http://example2.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      await expect(connectionService.removeConnection(adminUserContext, 1)).rejects.toThrow(
        ForbiddenError
      );
    });

    it('should remove connection successfully', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        fromNodeId: 2,
        targetNodeId: 3,
      });

      nodeService.get
        .mockResolvedValueOnce({
          id: 2,
          organizationId: 1,
          name: 'Node 2',
          type: 'internal',
          apiUrl: 'http://example.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .mockResolvedValueOnce({
          id: 3,
          organizationId: 2,
          name: 'Node 3',
          type: 'internal',
          apiUrl: 'http://example2.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      await connectionService.removeConnection(adminUserContext, 1);

      expect(dbMocks.db.updateTable).toHaveBeenCalledWith('connections');
    });
  });

  describe('rotateCredentials', () => {
    it('should throw NotFoundError if connection not found', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(connectionService.rotateCredentials(adminUserContext, 999)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should rotate credentials successfully', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        fromNodeId: 2,
        targetNodeId: 3,
        clientId: 'old-client-id',
        clientSecret: 'old-secret',
        status: 'accepted',
      });

      nodeService.get.mockResolvedValueOnce({
        id: 2,
        organizationId: 1,
        name: 'Node 2',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      const result = await connectionService.rotateCredentials(adminUserContext, 1);

      expect(result.connectionId).toBe(1);
      expect(result.clientId).toBeTruthy();
      expect(result.clientSecret).toBeTruthy();
      expect(result.clientId).not.toBe('old-client-id');
      expect(dbMocks.db.updateTable).toHaveBeenCalledWith('connections');
    });
  });

  describe('getCredentials', () => {
    it('should throw NotFoundError if connection not found', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(connectionService.getCredentials(adminUserContext, 999)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should return decrypted credentials', async () => {
      const mockConnection = {
        id: 1,
        fromNodeId: 2,
        targetNodeId: 3,
        clientId: 'client-1',
        clientSecret: Buffer.from('secret-1').toString('base64'),
        status: 'accepted',
      };

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockConnection);

      nodeService.get.mockResolvedValueOnce({
        id: 2,
        organizationId: 1,
        name: 'Node 2',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await connectionService.getCredentials(adminUserContext, 1);

      expect(result.connectionId).toBe(1);
      expect(result.clientId).toBe('client-1');
      expect(result.clientSecret).toBe('secret-1');
    });
  });
});
