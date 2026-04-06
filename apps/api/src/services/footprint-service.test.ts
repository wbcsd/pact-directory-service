import { FootprintService } from './footprint-service';
import { BadRequestError, NotFoundError, ForbiddenError } from '@src/common/errors';
import { Role } from '@src/common/policies';
import { createMockDatabase } from '../common/mock-utils';
import { UserContext } from './user-service';
import { NodeService } from './node-service';

describe('FootprintService', () => {
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let footprintService: FootprintService;
  let nodeService: NodeService;

  const adminUserContext: UserContext = {
    organizationId: 1,
    userId: 1,
    email: 'admin@example.com',
    role: Role.Administrator,
    policies: [
      'view-nodes-own-organization',
      'edit-nodes-own-organization',
      'manage-footprints-own-organization',
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
      'manage-footprints-all-organizations',
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

  const mockFootprint = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    status: 'Active', 
    created: '2025-09-20T00:00:00Z',
    companyName: 'Test Company', 
    companyIds: ['urn:https://acme.com'],
    specVersion: '3.0.0',
    productNameCompany: 'Test Product',
    productDescription: 'Test Product',
    productIds: ['urn:gtin:12345678'],
    productClassifications: ['urn:pact:productclassification:un-cpc:123'],
    pcf: {
      declaredUnitOfMeasurement: 'kilogram',
      declaredUnitAmount: '1000.0',
      productMassPerDeclaredUnit: '1000.0',
      pcfExcludingBiogenicUptake: '500.0',
      pcfIncludingBiogenicUptake: '450.0',
      fossilGhgEmissions: '480.0',
      fossilCarbonContent: '20.0',
      biogenicCarbonContent: '50.0',
      biogenicCO2Uptake: '-50.0',
      ipccCharacterizationFactors: ['AR6'],
      crossSectoralStandards: ['ISO14067'],
      boundaryProcessesDescription: 'Cradle-to-gate including raw material extraction and manufacturing',
      referencePeriodStart: '2023-01-01T00:00:00Z',
      referencePeriodEnd: '2023-12-31T23:59:59Z',
      geographyCountry: 'US',
      exemptedEmissionsPercent: '2.5',
      exemptedEmissionsDescription: 'Infrastructure and capital goods excluded',
      packagingEmissionsIncluded: true,
      packagingGhgEmissions: '10.0',
      primaryDataShare: '80.0',
    }
  }

  const mockFootprintData = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nodeId: 1,
    data: {
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
    footprintService = new FootprintService(dbMocks.db as any, nodeService);
  });

  describe('create', () => {
    it('should create a footprint for a node the user has access to', async () => {
      // Mock nodeService.get (selectFrom -> executeTakeFirst for node lookup)
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      // Mock the insert
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockFootprintData);

      const result = await footprintService.create(adminUserContext, 1, {
        data: mockFootprint, // Using the full mockFootprint object to ensure validation logic is exercised
      });

      expect(result).toEqual(mockFootprintData);
      expect(dbMocks.db.insertInto).toHaveBeenCalledWith('product_footprints');
    });

    it('should throw ForbiddenError if user does not have access to the node', async () => {
      // Node belongs to a different organization
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        ...mockNode,
        organizationId: 999,
      });

      await expect(
        footprintService.create(adminUserContext, 1, {
          data: { status: 'Active' },
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError if user has no footprint policies', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);

      await expect(
        footprintService.create(regularUserContext, 1, {
          data: { status: 'Active' },
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError if footprint data is not an object', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);

      await expect(
        footprintService.create(adminUserContext, 1, {
          data: null as any,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should allow root user to create footprint for any node', async () => {
      const otherOrgNode = { ...mockNode, organizationId: 999 };
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgNode);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({
        ...mockFootprintData,
        nodeId: otherOrgNode.id,
      });

      const result = await footprintService.create(rootUserContext, 1, {
        data: mockFootprint, // Using the full mockFootprint object to ensure validation logic is exercised
      });

      expect(result).toBeDefined();
      expect(dbMocks.db.insertInto).toHaveBeenCalledWith('product_footprints');
    });
  });

  describe('get', () => {
    it('should return a footprint if user has access', async () => {
      // Mock footprint lookup
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockFootprintData);
      // Mock node lookup (via nodeService.get)
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);

      const result = await footprintService.get(adminUserContext, mockFootprintData.id);

      expect(result).toEqual(mockFootprintData);
    });

    it('should throw NotFoundError if footprint does not exist', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(
        footprintService.get(adminUserContext, 'nonexistent-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not have access to the node', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockFootprintData);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        ...mockNode,
        organizationId: 999,
      });

      await expect(
        footprintService.get(adminUserContext, mockFootprintData.id)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow root user to view any footprint', async () => {
      const otherOrgFootprint = { ...mockFootprintData, nodeId: 2 };
      const otherOrgNode = { ...mockNode, id: 2, organizationId: 999 };

      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgFootprint);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgNode);

      const result = await footprintService.get(rootUserContext, otherOrgFootprint.id);

      expect(result).toEqual(otherOrgFootprint);
    });
  });

  describe('listByNode', () => {
    it('should return paginated list of footprints for a node', async () => {
      // Mock nodeService.get
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      // Mock count query
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 2 });
      // Mock data query
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintData, { ...mockFootprintData, id: 'second-id' }]);

      const result = await footprintService.listByNode(adminUserContext, 1);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should throw ForbiddenError if user does not have access to the node', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        ...mockNode,
        organizationId: 999,
      });

      await expect(
        footprintService.listByNode(adminUserContext, 1)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError if user has no footprint policies', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);

      await expect(
        footprintService.listByNode(regularUserContext, 1)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow root user to list footprints for any node', async () => {
      const otherOrgNode = { ...mockNode, organizationId: 999 };
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgNode);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintData]);

      const result = await footprintService.listByNode(rootUserContext, 1);

      expect(result.data).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('should delete a footprint if user has access', async () => {
      // Mock get -> footprint lookup
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockFootprintData);
      // Mock get -> node lookup (inside this.get)
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      // Mock delete -> node lookup (explicit in delete method)
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockNode);
      // Mock the delete execution
      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      const result = await footprintService.delete(adminUserContext, mockFootprintData.id);

      expect(result).toEqual({ success: true, footprintId: mockFootprintData.id });
      expect(dbMocks.db.deleteFrom).toHaveBeenCalledWith('product_footprints');
    });

    it('should throw NotFoundError if footprint does not exist', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(
        footprintService.delete(adminUserContext, 'nonexistent-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not have access', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockFootprintData);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        ...mockNode,
        organizationId: 999,
      });

      await expect(
        footprintService.delete(adminUserContext, mockFootprintData.id)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow root user to delete any footprint', async () => {
      const otherOrgFootprint = { ...mockFootprintData, nodeId: 2 };
      const otherOrgNode = { ...mockNode, id: 2, organizationId: 999 };

      // Mock get -> footprint lookup
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgFootprint);
      // Mock get -> node lookup (inside this.get)
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgNode);
      // Mock delete -> node lookup
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(otherOrgNode);
      // Mock delete execution
      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      const result = await footprintService.delete(rootUserContext, otherOrgFootprint.id);

      expect(result).toEqual({ success: true, footprintId: otherOrgFootprint.id });
    });
  });
});
