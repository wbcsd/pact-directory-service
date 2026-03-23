import { PCFDataService } from './pcf-data-service';
import { BadRequestError, NotFoundError, ForbiddenError } from '@src/common/errors';
import { Role } from '@src/common/policies';
import { createMockDatabase } from '../common/mock-utils';
import { UserContext } from './user-service';
import { NodeService } from './node-service';

describe('PCFDataService', () => {
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let pcfDataService: PCFDataService;
  let nodeService: NodeService;

  const adminUserContext: UserContext = {
    organizationId: 1,
    userId: 1,
    email: 'admin@example.com',
    role: Role.Administrator,
    policies: [
      'view-nodes-own-organization',
      'edit-nodes-own-organization',
      'manage-pcfs-own-organization',
    ],
    status: 'enabled',
  };

  const rootUserContext: UserContext = {
    organizationId: 1,
    userId: 2,
    email: 'root@example.com',
    role: Role.Root,
    policies: [
      'view-nodes-all-organizations',
      'edit-nodes-all-organizations',
      'manage-pcfs-all-organizations',
    ],
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

  const mockNode = {
    id: 1,
    organizationId: 1,
    name: 'Test Node',
    type: 'internal' as const,
    apiUrl: 'http://example.com',
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationName: 'Test Org',
  };

  const mockPcf = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nodeId: 1,
    pcf: {
      status: 'Active',
      companyName: 'Test Company',
      productDescription: 'Test Product',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    dbMocks = createMockDatabase();
    nodeService = new NodeService(dbMocks.db as any);
    pcfDataService = new PCFDataService(dbMocks.db as any, nodeService);
  });

  describe('create', () => {
    it('should create a PCF for a node the user has access to', async () => {
      // Mock nodeService.get (selectFrom -> executeTakeFirst for node lookup)
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      // Mock the insert
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockPcf);

      const result = await pcfDataService.create(adminUserContext, 1, {
        pcf: { status: 'Active', companyName: 'Test Company' },
      });

      expect(result).toEqual(mockPcf);
      expect(dbMocks.db.insertInto).toHaveBeenCalledWith('pcfs');
    });

    it('should throw ForbiddenError if user does not have access to the node', async () => {
      // Node belongs to a different organization
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        ...mockNode,
        organizationId: 999,
      });

      await expect(
        pcfDataService.create(adminUserContext, 1, {
          pcf: { status: 'Active' },
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError if user has no PCF policies', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);

      await expect(
        pcfDataService.create(regularUserContext, 1, {
          pcf: { status: 'Active' },
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError if PCF data is not an object', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);

      await expect(
        pcfDataService.create(adminUserContext, 1, {
          pcf: null as any,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should allow root user to create PCF for any node', async () => {
      const otherOrgNode = { ...mockNode, organizationId: 999 };
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgNode);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({
        ...mockPcf,
        nodeId: otherOrgNode.id,
      });

      const result = await pcfDataService.create(rootUserContext, 1, {
        pcf: { status: 'Active' },
      });

      expect(result).toBeDefined();
      expect(dbMocks.db.insertInto).toHaveBeenCalledWith('pcfs');
    });
  });

  describe('get', () => {
    it('should return a PCF if user has access', async () => {
      // Mock PCF lookup
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockPcf);
      // Mock node lookup (via nodeService.get)
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);

      const result = await pcfDataService.get(adminUserContext, mockPcf.id);

      expect(result).toEqual(mockPcf);
    });

    it('should throw NotFoundError if PCF does not exist', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(
        pcfDataService.get(adminUserContext, 'nonexistent-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not have access to the node', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockPcf);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        ...mockNode,
        organizationId: 999,
      });

      await expect(
        pcfDataService.get(adminUserContext, mockPcf.id)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow root user to view any PCF', async () => {
      const otherOrgPcf = { ...mockPcf, nodeId: 2 };
      const otherOrgNode = { ...mockNode, id: 2, organizationId: 999 };

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgPcf);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgNode);

      const result = await pcfDataService.get(rootUserContext, otherOrgPcf.id);

      expect(result).toEqual(otherOrgPcf);
    });
  });

  describe('listByNode', () => {
    it('should return paginated list of PCFs for a node', async () => {
      // Mock nodeService.get
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      // Mock count query
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 2 });
      // Mock data query
      dbMocks.executors.execute.mockResolvedValueOnce([mockPcf, { ...mockPcf, id: 'second-id' }]);

      const result = await pcfDataService.listByNode(adminUserContext, 1);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should throw ForbiddenError if user does not have access to the node', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        ...mockNode,
        organizationId: 999,
      });

      await expect(
        pcfDataService.listByNode(adminUserContext, 1)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError if user has no PCF policies', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);

      await expect(
        pcfDataService.listByNode(regularUserContext, 1)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow root user to list PCFs for any node', async () => {
      const otherOrgNode = { ...mockNode, organizationId: 999 };
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgNode);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockPcf]);

      const result = await pcfDataService.listByNode(rootUserContext, 1);

      expect(result.data).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('should delete a PCF if user has access', async () => {
      // Mock get -> PCF lookup
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockPcf);
      // Mock get -> node lookup (inside this.get)
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      // Mock delete -> node lookup (explicit in delete method)
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      // Mock the delete execution
      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      const result = await pcfDataService.delete(adminUserContext, mockPcf.id);

      expect(result).toEqual({ success: true, pcfId: mockPcf.id });
      expect(dbMocks.db.deleteFrom).toHaveBeenCalledWith('pcfs');
    });

    it('should throw NotFoundError if PCF does not exist', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(
        pcfDataService.delete(adminUserContext, 'nonexistent-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not have access', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockPcf);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        ...mockNode,
        organizationId: 999,
      });

      await expect(
        pcfDataService.delete(adminUserContext, mockPcf.id)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow root user to delete any PCF', async () => {
      const otherOrgPcf = { ...mockPcf, nodeId: 2 };
      const otherOrgNode = { ...mockNode, id: 2, organizationId: 999 };

      // Mock get -> PCF lookup
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgPcf);
      // Mock get -> node lookup (inside this.get)
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgNode);
      // Mock delete -> node lookup
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgNode);
      // Mock delete execution
      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      const result = await pcfDataService.delete(rootUserContext, otherOrgPcf.id);

      expect(result).toEqual({ success: true, pcfId: otherOrgPcf.id });
    });
  });
});
