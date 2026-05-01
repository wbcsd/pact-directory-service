import { NodeService } from './node-service';
import { BadRequestError, NotFoundError, ForbiddenError } from '@src/common/errors';
import { Role } from '@src/common/policies';
import { createMockDatabase } from '../common/mock-utils';
import { UserContext } from './user-service';
import { ListQuery } from '@src/common/list-query';

describe('NodeService', () => {
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let nodeService: NodeService;

  const adminUserContext: UserContext = {
    organizationId: 1,
    userId: 1,
    email: 'admin@example.com',
    role: Role.Administrator,
    policies: ['view-nodes-own-organization', 'edit-nodes-own-organization'],
    status: 'enabled',
  };

  const rootUserContext: UserContext = {
    organizationId: 1,
    userId: 2,
    email: 'root@example.com',
    role: Role.Root,
    policies: ['view-nodes-all-organizations', 'edit-nodes-all-organizations'],
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
    nodeService = new NodeService(dbMocks.db as any);
  });

  describe('get', () => {
    it('should throw NotFoundError if node does not exist', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(nodeService.get(adminUserContext, 999)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not have access', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        organizationId: 2, // Different organization
        name: 'Test Node',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(nodeService.get(adminUserContext, 1)).rejects.toThrow(ForbiddenError);
    });

    it('should return node if user has access', async () => {
      const mockNode = {
        id: 1,
        organizationId: 1,
        name: 'Test Node',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationName: 'Test Org',
      };

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);

      const result = await nodeService.get(adminUserContext, 1);

      expect(result).toEqual(mockNode);
    });

    it('should allow root user to view any node', async () => {
      const mockNode = {
        id: 1,
        organizationId: 999, // Different organization
        name: 'Test Node',
        type: 'external',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationName: 'Other Org',
      };

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);

      const result = await nodeService.get(rootUserContext, 1);

      expect(result).toEqual(mockNode);
    });
  });

  describe('create', () => {
    it('should throw ForbiddenError if user does not have permission', async () => {
      await expect(
        nodeService.create(regularUserContext, 1, {
          name: 'New Node',
          type: 'internal',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError if name is empty', async () => {
      await expect(
        nodeService.create(adminUserContext, 1, {
          name: '',
          type: 'internal',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if type is invalid', async () => {
      await expect(
        nodeService.create(adminUserContext, 1, {
          name: 'Test Node',
          type: 'invalid' as any,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if external node has no API URL', async () => {
      await expect(
        nodeService.create(adminUserContext, 1, {
          name: 'External Node',
          type: 'external',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should create internal node with generated API URL', async () => {
      const mockNode = {
        id: 1,
        organizationId: 1,
        name: 'Internal Node',
        type: 'internal',
        apiUrl: '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMocks.executors.executeTakeFirstOrThrow
        .mockResolvedValueOnce(mockNode);

      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      const result = await nodeService.create(adminUserContext, 1, {
        name: 'Internal Node',
        type: 'internal',
      });

      expect(result.type).toBe('internal');
      expect(result.apiUrl).toContain('/api/nodes/1');
      expect(dbMocks.db.updateTable).toHaveBeenCalledWith('nodes');
    });

    it('should create external node with provided API URL', async () => {
      const mockNode = {
        id: 2,
        organizationId: 1,
        name: 'External Node',
        type: 'external',
        apiUrl: 'https://external.example.com/api',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockNode);

      const result = await nodeService.create(adminUserContext, 1, {
        name: 'External Node',
        type: 'external',
        apiUrl: 'https://external.example.com/api',
      });

      expect(result.type).toBe('external');
      expect(result.apiUrl).toBe('https://external.example.com/api');
    });

    it('should create external node with auth fields', async () => {
      const mockNode = {
        id: 3,
        organizationId: 1,
        name: 'External Node',
        type: 'external',
        apiUrl: 'https://external.example.com/api',
        authBaseUrl: 'https://auth.example.com',
        scope: 'openid',
        audience: 'https://api.example.com',
        resource: 'https://api.example.com',
        specVersion: 'V3.0',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockNode);

      const result = await nodeService.create(adminUserContext, 1, {
        name: 'External Node',
        type: 'external',
        apiUrl: 'https://external.example.com/api',
        authBaseUrl: 'https://auth.example.com',
        scope: 'openid',
        audience: 'https://api.example.com',
        resource: 'https://api.example.com',
        specVersion: 'V3.0',
      });

      expect(result.authBaseUrl).toBe('https://auth.example.com');
      expect(result.scope).toBe('openid');
      expect(result.audience).toBe('https://api.example.com');
      expect(result.resource).toBe('https://api.example.com');
      expect(result.specVersion).toBe('V3.0');
    });

    it('should allow root user to create node for any organization', async () => {
      const mockNode = {
        id: 3,
        organizationId: 999,
        name: 'Root Created Node',
        type: 'internal',
        apiUrl: '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockNode);
      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      const result = await nodeService.create(rootUserContext, 999, {
        name: 'Root Created Node',
        type: 'internal',
      });

      expect(result.organizationId).toBe(999);
    });
  });

  describe('update', () => {
    it('should throw ForbiddenError if user does not have permission', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        organizationId: 1,
        name: 'Test Node',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        nodeService.update(regularUserContext, 1, { name: 'Updated' })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError if name is empty', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        organizationId: 1,
        name: 'Test Node',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        nodeService.update(adminUserContext, 1, { name: '' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if trying to change internal node API URL', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        organizationId: 1,
        name: 'Internal Node',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        nodeService.update(adminUserContext, 1, { apiUrl: 'http://new.com' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should update node name successfully', async () => {
      const mockNode = {
        id: 1,
        organizationId: 1,
        name: 'Old Name',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({
        ...mockNode,
        name: 'New Name',
      });

      const result = await nodeService.update(adminUserContext, 1, { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('should update node status successfully', async () => {
      const mockNode = {
        id: 1,
        organizationId: 1,
        name: 'Test Node',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({
        ...mockNode,
        status: 'inactive' as const,
      });

      const result = await nodeService.update(adminUserContext, 1, { status: 'inactive' });

      expect(result.status).toBe('inactive');
    });

    it('should allow updating external node API URL', async () => {
      const mockNode = {
        id: 1,
        organizationId: 1,
        name: 'External Node',
        type: 'external' as const,
        apiUrl: 'http://old.com',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({
        ...mockNode,
        apiUrl: 'http://new.com',
      });

      const result = await nodeService.update(adminUserContext, 1, { apiUrl: 'http://new.com' });

      expect(result.apiUrl).toBe('http://new.com');
    });

    it('should update auth fields on an external node', async () => {
      const mockNode = {
        id: 1,
        organizationId: 1,
        name: 'External Node',
        type: 'external' as const,
        apiUrl: 'http://external.com',
        authBaseUrl: null,
        scope: null,
        audience: null,
        resource: null,
        specVersion: null,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({
        ...mockNode,
        authBaseUrl: 'https://auth.example.com',
        scope: 'openid',
        audience: 'https://api.example.com',
        resource: 'https://api.example.com',
        specVersion: 'V3.0',
      });

      const result = await nodeService.update(adminUserContext, 1, {
        authBaseUrl: 'https://auth.example.com',
        scope: 'openid',
        audience: 'https://api.example.com',
        resource: 'https://api.example.com',
        specVersion: 'V3.0',
      });

      expect(result.authBaseUrl).toBe('https://auth.example.com');
      expect(result.scope).toBe('openid');
      expect(result.audience).toBe('https://api.example.com');
      expect(result.resource).toBe('https://api.example.com');
      expect(result.specVersion).toBe('V3.0');
    });

    it('should ignore auth fields when updating an internal node', async () => {
      const mockNode = {
        id: 1,
        organizationId: 1,
        name: 'Internal Node',
        type: 'internal' as const,
        apiUrl: 'http://internal.com',
        authBaseUrl: null,
        scope: null,
        audience: null,
        resource: null,
        specVersion: null,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockNode);

      const result = await nodeService.update(adminUserContext, 1, {
        authBaseUrl: 'https://auth.example.com',
        specVersion: 'V3.0',
      });

      // Auth fields should not be set on internal nodes
      expect(result.authBaseUrl).toBeNull();
      expect(result.specVersion).toBeNull();
    });
  });

  describe('delete', () => {
    it('should throw ForbiddenError if user does not have permission', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        organizationId: 2,
        name: 'Test Node',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(nodeService.delete(regularUserContext, 1)).rejects.toThrow(ForbiddenError);
    });

    it('should delete node', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        id: 1,
        organizationId: 1,
        name: 'Test Node',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      await nodeService.delete(adminUserContext, 1);
      expect(dbMocks.db.deleteFrom).toHaveBeenCalledWith('nodes');
    });
  });

  describe('list', () => {
    it('should throw ForbiddenError if user does not have permission', async () => {
      await expect(
        nodeService.list(regularUserContext, 1, ListQuery.default())
      ).rejects.toThrow(ForbiddenError);
    });

    it('should return paginated list of nodes', async () => {
      const mockNodes = [
        {
          id: 1,
          organizationId: 1,
          name: 'Node 1',
          type: 'internal',
          apiUrl: 'http://example1.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationName: 'Test Org',
          connectionsCount: 3,
        },
        {
          id: 2,
          organizationId: 1,
          name: 'Node 2',
          type: 'external',
          apiUrl: 'http://example2.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationName: 'Test Org',
          connectionsCount: 5,
        },
      ];

      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 2 });
      dbMocks.executors.execute.mockResolvedValueOnce(mockNodes);

      const result = await nodeService.list(adminUserContext, 1, ListQuery.default());

      expect(result.data).toEqual(mockNodes);
      expect(result.pagination.total).toBe(2);
      expect(result.data[0].connectionsCount).toBe(3);
      expect(result.data[1].connectionsCount).toBe(5);
    });

    it('should apply filters correctly', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 0 });
      dbMocks.executors.execute.mockResolvedValueOnce([]);

      const query = new ListQuery({ filters: { type: 'internal', status: 'active' } });
      await nodeService.list(adminUserContext, 1, query);

      expect(dbMocks.queryChain.where).toHaveBeenCalled();
    });

    it('should include connectionsCount in response', async () => {
      const mockNodes = [
        {
          id: 1,
          organizationId: 1,
          name: 'Node with connections',
          type: 'internal',
          apiUrl: 'http://example1.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationName: 'Test Org',
          connectionsCount: 10,
        },
        {
          id: 2,
          organizationId: 1,
          name: 'Node without connections',
          type: 'external',
          apiUrl: 'http://example2.com',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationName: 'Test Org',
          connectionsCount: 0,
        },
      ];

      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 2 });
      dbMocks.executors.execute.mockResolvedValueOnce(mockNodes);

      const result = await nodeService.list(adminUserContext, 1, ListQuery.default());

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('connectionsCount');
      expect(result.data[0].connectionsCount).toBe(10);
      expect(result.data[1].connectionsCount).toBe(0);
    });

    it('should count both incoming and outgoing connections', async () => {
      const mockNode = {
        id: 1,
        organizationId: 1,
        name: 'Node with bidirectional connections',
        type: 'internal',
        apiUrl: 'http://example.com',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationName: 'Test Org',
        connectionsCount: 7, // Total of incoming + outgoing
      };

      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockNode]);

      const result = await nodeService.list(adminUserContext, 1, ListQuery.default());

      expect(result.data[0].connectionsCount).toBe(7);
    });
  });
});
