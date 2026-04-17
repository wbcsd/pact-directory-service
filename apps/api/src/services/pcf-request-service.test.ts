import { PcfRequestService } from './pcf-request-service';
import { BadRequestError, ForbiddenError, NotFoundError } from '@src/common/errors';
import { Role } from '@src/common/policies';
import { createMockDatabase } from '../common/mock-utils';
import { UserContext } from './user-service';
import { NodeService } from './node-service';
import { NodeConnectionService } from './node-connection-service';

jest.mock('@src/common/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('@src/common/config', () => ({
  JWT_SECRET: 'test-secret',
  DIRECTORY_API: 'http://localhost:3010',
}));

// Mock PactApiClient so no real HTTP calls are made in tests
const mockSendRequestCreated = jest.fn().mockResolvedValue('event-id-abc123');
jest.mock('pact-api-client', () => ({
  PactApiClient: jest.fn().mockImplementation(() => ({
    sendRequestCreated: mockSendRequestCreated,
  })),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PcfRequestService', () => {
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let service: PcfRequestService;
  let nodeService: jest.Mocked<Pick<NodeService, 'get'>>;
  let nodeConnectionService: jest.Mocked<Pick<NodeConnectionService, 'verifyConnectionCredentials'>>;

  const DIRECTORY_API = 'http://localhost:3010';
  const nodeId = 5;
  const targetNodeId = 7;
  const connectionId = 42;

  // Contexts
  const adminContext: UserContext = {
    organizationId: 1,
    userId: 1,
    email: 'admin@example.com',
    role: Role.Administrator,
    policies: ['manage-connections-own-nodes'],
    status: 'enabled',
  };

  const otherOrgContext: UserContext = {
    organizationId: 99,
    userId: 9,
    email: 'other@example.com',
    role: Role.User,
    policies: ['manage-connections-own-nodes'],
    status: 'enabled',
  };

  // Fixtures
  const mockFromNode = {
    id: nodeId,
    organizationId: 1,
    name: 'Sender Node',
    type: 'internal' as const,
    status: 'active' as const,
  };

  const mockTargetNode = {
    id: targetNodeId,
    type: 'internal' as const,
    apiUrl: null,
    authBaseUrl: null,
    scope: null,
    audience: null,
    resource: null,
  };

  const mockConnection = {
    id: connectionId,
    fromNodeId: nodeId,
    targetNodeId,
    clientId: 'client-abc',
    // decryptSecret does Buffer.from(x, 'base64').toString('utf-8'), so store base64
    clientSecret: Buffer.from('secret-xyz').toString('base64'),
    status: 'accepted' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: null,
  };

  const mockFilters = { productId: ['urn:gtin:1234567890123'] };

  // ── Real silversurfer23 PCF fixtures (from production DB) ──────────────────
  // These are the actual JSONB data objects stored in product_footprints.data.
  // Each fixture pair: dbRowId (product_footprints.id) + pactDataId (data->>'id').
  // These are DIFFERENT values — the bug was querying by pactDataId when we
  // should query by dbRowId.

  const ss23LaptopDbId   = '22b351ba-f84b-496a-b3d5-7c5c36cacf84'; // DB row UUID
  const ss23SteelDbId    = 'd5b18f05-b723-48d7-97f6-96e29a8a1ec6';
  const ss23ContainerDbId = '229e354d-082b-4750-9918-fea94e661acf';

  const ss23LaptopData = {
    id: 'd9be4477-e351-45b3-acd9-e1da05e6f633', // PACT data ID — different from DB row UUID above
    specVersion: '3.0.0',
    version: 1,
    created: '2023-07-01T00:00:00Z',
    status: 'Active',
    validityPeriodStart: '2023-01-15T10:15:30Z',
    validityPeriodEnd: '2025-12-31T00:00:00Z',
    companyName: 'Example Company Inc.',
    companyIds: ['urn:uuid:12345678-1234-1234-1234-123456789012'],
    productDescription: 'Exemplary Laptop Model X',
    productIds: ['urn:gtin:12345678'],
    productNameCompany: 'Laptop Model X',
    productClassifications: ['urn:pact:productclassification:un-cpc:452'],
    pcf: {
      geographyCountry: 'US',
      declaredUnitOfMeasurement: 'kilogram',
      declaredUnitAmount: '1.0',
      referencePeriodStart: '2022-01-01T00:00:00Z',
      referencePeriodEnd: '2022-12-31T23:59:59Z',
      pcfExcludingBiogenicUptake: '120.5',
      pcfIncludingBiogenicUptake: '120.5',
      fossilGhgEmissions: '115.2',
      fossilCarbonContent: '5.3',
      boundaryProcessesDescription: 'Cradle-to-gate',
      ipccCharacterizationFactors: ['AR6'],
      crossSectoralStandards: ['GHGP-Product', 'ISO14067'],
      exemptedEmissionsPercent: '2.5',
    },
  };

  const ss23SteelData = {
    id: 'f8c3d912-7b4e-4a2c-b567-8e9f0a1b2c3d',
    specVersion: '3.0.0',
    version: 2,
    created: '2023-08-15T00:00:00Z',
    status: 'Active',
    validityPeriodStart: '2023-01-15T10:15:30Z',
    validityPeriodEnd: '2025-12-31T00:00:00Z',
    companyName: 'Green Materials Corp',
    companyIds: ['urn:uuid:87654321-4321-4321-4321-210987654321'],
    productDescription: 'Sustainable Steel Beam Grade A',
    productIds: ['urn:gtin:87654321', 'urn:ean:9876543210123'],
    productNameCompany: 'EcoSteel Beam A500',
    productClassifications: ['urn:pact:productclassification:un-cpc:412'],
    pcf: {
      geographyCountry: 'DE',
      declaredUnitOfMeasurement: 'kilogram',
      declaredUnitAmount: '1000.0',
      referencePeriodStart: '2023-01-01T00:00:00Z',
      referencePeriodEnd: '2023-06-30T23:59:59Z',
      pcfExcludingBiogenicUptake: '450.8',
      pcfIncludingBiogenicUptake: '420.5',
      fossilGhgEmissions: '440.2',
      fossilCarbonContent: '10.6',
      boundaryProcessesDescription: 'Cradle-to-gate including iron ore mining',
      ipccCharacterizationFactors: ['AR6'],
      crossSectoralStandards: ['ISO14067', 'ISO14040-44'],
      exemptedEmissionsPercent: '1.8',
    },
  };

  const ss23ContainerData = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    specVersion: '3.0.0',
    version: 1,
    created: '2023-09-20T00:00:00Z',
    status: 'Active',
    validityPeriodStart: '2023-09-01T00:00:00Z',
    validityPeriodEnd: '2024-08-31T23:59:59Z',
    companyName: 'BioPack Solutions',
    companyIds: ['urn:uuid:abcdef12-3456-7890-abcd-ef1234567890'],
    productDescription: 'Compostable Food Container 500ml',
    productIds: ['urn:gtin:55667788'],
    productNameCompany: 'EcoContainer 500',
    productClassifications: ['urn:pact:productclassification:un-cpc:893'],
    pcf: {
      geographyCountry: 'NL',
      declaredUnitOfMeasurement: 'kilogram',
      declaredUnitAmount: '0.025',
      referencePeriodStart: '2023-01-01T00:00:00Z',
      referencePeriodEnd: '2023-08-31T23:59:59Z',
      pcfExcludingBiogenicUptake: '0.85',
      pcfIncludingBiogenicUptake: '-0.15',
      fossilGhgEmissions: '0.75',
      fossilCarbonContent: '0.10',
      boundaryProcessesDescription: 'Cradle-to-gate',
      ipccCharacterizationFactors: ['AR5'],
      crossSectoralStandards: ['GHGP-Product'],
      exemptedEmissionsPercent: '3.2',
    },
  };

  // DB rows as returned by product_footprints SELECT
  const ss23LaptopRow    = { id: ss23LaptopDbId,    nodeId, data: ss23LaptopData };
  const ss23SteelRow     = { id: ss23SteelDbId,     nodeId, data: ss23SteelData };
  const ss23ContainerRow = { id: ss23ContainerDbId, nodeId, data: ss23ContainerData };

  const mockInsertedRow = {
    id: 1,
    fromNodeId: nodeId,
    targetNodeId,
    connectionId,
    requestEventId: 'event-id-abc123',
    source: null,
    filters: mockFilters,
    status: 'pending' as const,
    resultCount: null,
    fulfilledFootprintIds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dbMocks = createMockDatabase();
    nodeService = { get: jest.fn() } as any;
    nodeConnectionService = { verifyConnectionCredentials: jest.fn() } as any;
    service = new PcfRequestService(
      dbMocks.db as any,
      nodeService as any,
      nodeConnectionService as any,
      DIRECTORY_API
    );
  });

  // ──────────────────────────────────────────────────
  // create()
  // ──────────────────────────────────────────────────
  describe('create()', () => {
    it('sends RequestCreatedEvent and persists the outgoing request', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockConnection); // load connection
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);              // access check
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockTargetNode);  // target node
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockInsertedRow); // insert

      const result = await service.create(adminContext, nodeId, {
        connectionId,
        filters: mockFilters,
      });

      expect(result.direction).toBe('outgoing');
      expect(result.status).toBe('pending');
      expect(result.requestEventId).toBe('event-id-abc123');
      expect(result.fromNodeId).toBe(nodeId);
      expect(result.targetNodeId).toBe(targetNodeId);
      expect(mockSendRequestCreated).toHaveBeenCalledWith(mockFilters);
    });

    it('builds the PactApiClient with the connection credentials', async () => {
      const { PactApiClient } = require('pact-api-client');
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockConnection);
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockTargetNode);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockInsertedRow);

      await service.create(adminContext, nodeId, { connectionId, filters: mockFilters });

      expect(PactApiClient).toHaveBeenCalledWith(
        // baseUrl: no apiUrl so falls back to directory internal URL
        `${DIRECTORY_API}/api/nodes/${targetNodeId}`,
        'client-abc',
        'secret-xyz', // decrypted from base64
        `${DIRECTORY_API}/api/nodes/${nodeId}`,
        expect.any(Object)
      );
    });

    it('uses the node apiUrl when present', async () => {
      const { PactApiClient } = require('pact-api-client');
      const nodeWithUrl = { ...mockTargetNode, apiUrl: 'https://external.example.com/pact/' };
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockConnection);
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(nodeWithUrl);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockInsertedRow);

      await service.create(adminContext, nodeId, { connectionId, filters: mockFilters });

      expect(PactApiClient).toHaveBeenCalledWith(
        'https://external.example.com/pact', // trailing slash stripped
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('throws BadRequestError when no filters are provided', async () => {
      await expect(
        service.create(adminContext, nodeId, { connectionId, filters: {} })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError when connection does not exist or is not accepted', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(
        service.create(adminContext, nodeId, { connectionId, filters: mockFilters })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError when the node is the targetNodeId (incoming connection)', async () => {
      // fromNodeId is someone else — this node is the target, not the initiator
      const incomingConnection = { ...mockConnection, fromNodeId: 999, targetNodeId: nodeId };
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(incomingConnection);

      await expect(
        service.create(adminContext, nodeId, { connectionId, filters: mockFilters })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when the connection belongs to an unrelated node', async () => {
      const unrelatedConnection = { ...mockConnection, fromNodeId: 888, targetNodeId: 999 };
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(unrelatedConnection);

      await expect(
        service.create(adminContext, nodeId, { connectionId, filters: mockFilters })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws ForbiddenError when user belongs to a different organization', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockConnection);
      nodeService.get.mockResolvedValueOnce(mockFromNode as any); // org 1

      await expect(
        service.create(otherOrgContext /* org 99 */, nodeId, { connectionId, filters: mockFilters })
      ).rejects.toThrow(ForbiddenError);
    });

    it('propagates errors from PactApiClient (e.g. auth failure)', async () => {
      mockSendRequestCreated.mockRejectedValueOnce(
        new Error('Authentication failed: 401 Unauthorized')
      );
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockConnection);
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockTargetNode);

      await expect(
        service.create(adminContext, nodeId, { connectionId, filters: mockFilters })
      ).rejects.toThrow('Authentication failed');
    });

    it('succeeds even when the target node (shared DB) already inserted the incoming row — ON CONFLICT DO UPDATE path', async () => {
      // Reproduces the "duplicate key value violates unique constraint pcf_requests_request_event_id_key"
      // bug that occurs when both nodes share the same directory service instance:
      //   1. create() sends the RequestCreatedEvent to the target's /3/events
      //   2. target's handleRequestCreatedEvent() inserts the incoming row (requestEventId = X)
      //   3. create() then tries to insert the outgoing row with the same requestEventId = X
      // The ON CONFLICT DO UPDATE clause handles this by updating connectionId on the existing row.
      // The mock simulates the DB returning the merged row (same as regular insert path).
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockConnection);
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockTargetNode);
      // Simulate DB returning the upserted (conflict-updated) row
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce(mockInsertedRow);

      const result = await service.create(adminContext, nodeId, { connectionId, filters: mockFilters });

      expect(result.direction).toBe('outgoing');
      expect(result.requestEventId).toBe('event-id-abc123');
      expect(result.connectionId).toBe(connectionId);
    });
  });

  // ──────────────────────────────────────────────────
  // list() — direction and access control
  // ──────────────────────────────────────────────────
  describe('list() — direction and access', () => {
    const outgoingRow = {
      id: 1,
      fromNodeId: nodeId,
      targetNodeId,
      connectionId,
      requestEventId: 'ev-out',
      source: null,
      filters: mockFilters,
      status: 'pending',
      resultCount: null,
      fulfilledFootprintIds: null,
      fromNodeName: 'Sender Node',
      targetNodeName: 'Target Node',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const incomingRow = {
      ...outgoingRow,
      id: 2,
      fromNodeId: 888,
      targetNodeId: nodeId,
      requestEventId: 'ev-in',
      fromNodeName: 'External Node',
      targetNodeName: 'Sender Node',
    };

    it('sets direction=outgoing for requests sent by this node', async () => {
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 2 });
      dbMocks.executors.execute.mockResolvedValueOnce([outgoingRow, incomingRow]);
      // incoming pending fulfillable check
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      const result = await service.list(adminContext, nodeId);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].direction).toBe('outgoing');
      expect(result.data[1].direction).toBe('incoming');
    });

    it('throws ForbiddenError when user belongs to a different organization', async () => {
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);

      await expect(service.list(otherOrgContext, nodeId)).rejects.toThrow(ForbiddenError);
    });
  });

  // ──────────────────────────────────────────────────
  // list() — fulfillable checks with real filter types
  // ──────────────────────────────────────────────────
  describe('list() — fulfillable check with various filter types', () => {
    const makeIncomingRow = (filters: Record<string, unknown>) => ({
      id: 2,
      fromNodeId: 888,
      targetNodeId: nodeId,
      connectionId,
      requestEventId: 'ev-in',
      source: `${DIRECTORY_API}/api/nodes/888`,
      filters,
      status: 'pending',
      resultCount: null,
      fulfilledFootprintIds: null,
      fromNodeName: 'Requester Node',
      targetNodeName: 'silversurfer23',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('fulfillable=true for productId filter when node has a matching footprint', async () => {
      const row = makeIncomingRow({ productId: ['urn:gtin:12345678'] });
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([row]);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({ id: ss23LaptopDbId }); // match found

      const result = await service.list(adminContext, nodeId);
      expect(result.data[0].fulfillable).toBe(true);
    });

    it('fulfillable=false for productId filter when node has no matching footprint', async () => {
      const row = makeIncomingRow({ productId: ['urn:gtin:99999999'] }); // non-existent
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([row]);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null); // no match

      const result = await service.list(adminContext, nodeId);
      expect(result.data[0].fulfillable).toBe(false);
    });

    it('fulfillable=true for geography-only filter when node has any footprints', async () => {
      // No productId filter — fulfillable check uses ANY footprint heuristic
      const row = makeIncomingRow({ geography: ['US'] });
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([row]);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({ id: ss23LaptopDbId }); // has footprints

      const result = await service.list(adminContext, nodeId);
      expect(result.data[0].fulfillable).toBe(true);
    });

    it('fulfillable=false for geography-only filter when node has no footprints at all', async () => {
      const row = makeIncomingRow({ geography: ['JP'] });
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([row]);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      const result = await service.list(adminContext, nodeId);
      expect(result.data[0].fulfillable).toBe(false);
    });

    it('does not set fulfillable on outgoing rows', async () => {
      const outgoing = makeIncomingRow({ productId: ['urn:gtin:12345678'] });
      outgoing.fromNodeId = nodeId;      // make it outgoing
      outgoing.targetNodeId = 888;
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([outgoing]);

      const result = await service.list(adminContext, nodeId);
      expect(result.data[0].direction).toBe('outgoing');
      expect(result.data[0].fulfillable).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────
  // fulfill()
  // ──────────────────────────────────────────────────
  describe('fulfill()', () => {
    // fromNodeId=null skips the local-node direct-write path, keeping most tests isolated.
    // Tests that cover the direct-write path use a separate fixture with a known fromNodeId.
    const mockIncomingRequest = {
      id: 10,
      fromNodeId: null,
      targetNodeId: nodeId,
      requestEventId: 'req-ev-001',
      source: `${DIRECTORY_API}/api/nodes/888`,
      status: 'pending',
      filters: { geography: ['US'] },
    };

    // Use the real silversurfer23 US laptop row — DB row id ≠ PACT data id
    const mockFootprintRow = { data: ss23LaptopData };

    const mockReverseConnection = {
      clientId: 'cb-client',
      clientSecret: Buffer.from('cb-secret').toString('base64'),
    };

    beforeEach(() => {
      // getCallbackToken: reverse connection + auth token fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'callback-token-xyz' }),
        })
        .mockResolvedValueOnce({ ok: true }); // callback POST
    });

    it('queries footprints by DB row id column, not by PACT data id field', async () => {
      // This test verifies the fix for the bug where fulfill() was querying
      // `data->>'id'` (the PACT JSON field) instead of the `id` DB column.
      // The FulfillPcfRequestForm sends DB row UUIDs; the PACT data id inside
      // the JSONB is a completely different value.
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(mockIncomingRequest)
        .mockResolvedValueOnce(mockReverseConnection);
      dbMocks.executors.execute
        .mockResolvedValueOnce([mockFootprintRow])  // footprint lookup
        .mockResolvedValueOnce(undefined);          // UPDATE

      await service.fulfill(adminContext, nodeId, 10, [ss23LaptopDbId]);

      // Verify the footprint lookup used the DB row `id` column with 'in' operator,
      // NOT the `data->>'id'` JSON field (which would be ss23LaptopData.id = 'd9be4477...')
      const whereCalls = dbMocks.queryChain.where.mock.calls;
      const footprintIdLookup = whereCalls.find(
        (args) => args[0] === 'id' && args[1] === 'in'
      );
      expect(footprintIdLookup).toBeDefined();
      expect(footprintIdLookup![2]).toEqual([ss23LaptopDbId]);
    });

    it('the PACT data id (inside JSON) would NOT find footprints via DB row id lookup', async () => {
      // Simulates what the OLD buggy code would have experienced:
      // passing the PACT data id (ss23LaptopData.id) instead of the DB row UUID.
      // The mock returns empty because nothing matches — proving the bug.
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockIncomingRequest);
      dbMocks.executors.execute.mockResolvedValueOnce([]); // no match — this is what the bug caused

      await expect(
        service.fulfill(adminContext, nodeId, 10, [ss23LaptopData.id]) // PACT data id, not DB id
      ).rejects.toThrow(NotFoundError);
    });

    it('sends RequestFulfilledEvent with the PCF data from the matched footprints', async () => {
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(mockIncomingRequest)
        .mockResolvedValueOnce(mockReverseConnection);
      dbMocks.executors.execute
        .mockResolvedValueOnce([mockFootprintRow])
        .mockResolvedValueOnce(undefined);

      await service.fulfill(adminContext, nodeId, 10, [ss23LaptopDbId]);

      const callbackCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('/3/events')
      );
      expect(callbackCall).toBeDefined();
      const body = JSON.parse(callbackCall![1].body);
      expect(body.type).toBe('org.wbcsd.pact.ProductFootprint.RequestFulfilledEvent.3');
      expect(body.data.requestEventId).toBe('req-ev-001');
      expect(body.data.pfs).toHaveLength(1);
      expect(body.data.pfs[0].id).toBe(ss23LaptopData.id);
    });

    it('stores fulfilledFootprintIds as a JSON string (not native array) to satisfy the jsonb column', async () => {
      // Reproduces: "invalid input syntax for type json" — PostgreSQL rejects a native
      // JS array passed as jsonb because pg sends it as "{uuid...}" (array literal)
      // instead of the valid JSON format ["uuid..."]. The fix is JSON.stringify().
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(mockIncomingRequest)
        .mockResolvedValueOnce(mockReverseConnection);
      dbMocks.executors.execute
        .mockResolvedValueOnce([mockFootprintRow])
        .mockResolvedValueOnce(undefined);

      await service.fulfill(adminContext, nodeId, 10, [ss23LaptopDbId]);

      const setCalls = dbMocks.queryChain.set.mock.calls;
      const updateCall = setCalls.find((args) => args[0]?.status === 'fulfilled');
      expect(updateCall).toBeDefined();
      // Must be a JSON string, not a raw array
      expect(typeof updateCall![0].fulfilledFootprintIds).toBe('string');
      expect(JSON.parse(updateCall![0].fulfilledFootprintIds)).toEqual([ss23LaptopDbId]);
    });

    it('can fulfill with multiple footprints (e.g. DE steel + NL container)', async () => {
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(mockIncomingRequest)
        .mockResolvedValueOnce(mockReverseConnection);
      dbMocks.executors.execute
        .mockResolvedValueOnce([{ data: ss23SteelData }, { data: ss23ContainerData }])
        .mockResolvedValueOnce(undefined);

      await service.fulfill(adminContext, nodeId, 10, [ss23SteelDbId, ss23ContainerDbId]);

      const callbackCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('/3/events')
      );
      expect(callbackCall).toBeDefined();
      const body = JSON.parse(callbackCall![1].body);
      expect(body.data.pfs).toHaveLength(2);
    });

    it('marks fulfilled even when callback returns non-OK (best-effort)', async () => {
      jest.clearAllMocks();
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token' }) })
        .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'Service Unavailable' });

      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(mockIncomingRequest)
        .mockResolvedValueOnce(mockReverseConnection);
      dbMocks.executors.execute
        .mockResolvedValueOnce([mockFootprintRow])
        .mockResolvedValueOnce(undefined);

      await expect(
        service.fulfill(adminContext, nodeId, 10, [ss23LaptopDbId])
      ).resolves.toBeUndefined();
    });

    it('marks fulfilled even when source URL is null (no callback sent)', async () => {
      jest.clearAllMocks();
      const noSourceRequest = { ...mockIncomingRequest, source: null };

      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(noSourceRequest);
      dbMocks.executors.execute
        .mockResolvedValueOnce([mockFootprintRow])
        .mockResolvedValueOnce(undefined);

      await expect(
        service.fulfill(adminContext, nodeId, 10, [ss23LaptopDbId])
      ).resolves.toBeUndefined();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws BadRequestError when footprintIds is empty', async () => {
      await expect(
        service.fulfill(adminContext, nodeId, 10, [])
      ).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError when no pending incoming request found', async () => {
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(
        service.fulfill(adminContext, nodeId, 10, [ss23LaptopDbId])
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when DB row IDs do not match any footprint', async () => {
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockIncomingRequest);
      dbMocks.executors.execute.mockResolvedValueOnce([]); // nothing found

      await expect(
        service.fulfill(adminContext, nodeId, 10, ['00000000-0000-0000-0000-000000000000'])
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when user lacks permission', async () => {
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);

      await expect(
        service.fulfill(otherOrgContext, nodeId, 10, [ss23LaptopDbId])
      ).rejects.toThrow(ForbiddenError);
    });

    it('writes PCFs directly into the requester node product_footprints when fromNodeId is a local node (new insert)', async () => {
      // Reproduces the real scenario:
      // silversurfer23 fulfills a request from galactus. HTTP callback fails because
      // no reverse connection exists for auth. The fix: detect that galactus is a local
      // node and insert directly into its product_footprints.
      const localFromNodeId = 14; // galactus
      const localRequest = { ...mockIncomingRequest, fromNodeId: localFromNodeId };
      jest.clearAllMocks();
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token' }) })
        .mockResolvedValueOnce({ ok: true, text: async () => '' });

      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(localRequest)          // load pcf_request
        .mockResolvedValueOnce(mockReverseConnection) // getCallbackToken: reverse connection
        .mockResolvedValueOnce({ id: localFromNodeId }) // node existence check
        .mockResolvedValueOnce(null);                 // no existing product_footprints row
      dbMocks.executors.execute
        .mockResolvedValueOnce([mockFootprintRow])    // footprint lookup
        .mockResolvedValueOnce(undefined)             // UPDATE pcf_requests
        .mockResolvedValueOnce(undefined);            // INSERT product_footprints

      await service.fulfill(adminContext, nodeId, 10, [ss23LaptopDbId]);

      // INSERT into product_footprints for the requester node
      const insertCalls = dbMocks.db.insertInto.mock.calls.filter(
        (c) => c[0] === 'product_footprints'
      );
      expect(insertCalls).toHaveLength(1);
      const insertValues = dbMocks.queryChain.values.mock.calls.find(
        () => true
      );
      expect(insertValues).toBeDefined();
      expect(insertValues![0].nodeId).toBe(localFromNodeId);
    });

    it('upserts product_footprints for requester node when PCF already present', async () => {
      const localFromNodeId = 14;
      const localRequest = { ...mockIncomingRequest, fromNodeId: localFromNodeId };
      jest.clearAllMocks();
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token' }) })
        .mockResolvedValueOnce({ ok: true, text: async () => '' });

      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(localRequest)
        .mockResolvedValueOnce(mockReverseConnection)
        .mockResolvedValueOnce({ id: localFromNodeId });      // node exists
      dbMocks.executors.execute
        .mockResolvedValueOnce([mockFootprintRow])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      await service.fulfill(adminContext, nodeId, 10, [ss23LaptopDbId]);

      // Uses INSERT...ON CONFLICT (upsert) for product_footprints
      const insertCalls = dbMocks.db.insertInto.mock.calls.filter(
        (c) => c[0] === 'product_footprints'
      );
      expect(insertCalls).toHaveLength(1);
    });

    it('skips direct-write when fromNodeId is null (external requester)', async () => {
      // mockIncomingRequest already has fromNodeId=null
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(mockIncomingRequest)
        .mockResolvedValueOnce(mockReverseConnection);
      dbMocks.executors.execute
        .mockResolvedValueOnce([mockFootprintRow])
        .mockResolvedValueOnce(undefined);

      await service.fulfill(adminContext, nodeId, 10, [ss23LaptopDbId]);

      // No insert into product_footprints
      const insertCalls = dbMocks.db.insertInto.mock.calls.filter(
        (c) => c[0] === 'product_footprints'
      );
      expect(insertCalls).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────────
  // reject()
  // ──────────────────────────────────────────────────
  describe('reject()', () => {
    const mockIncomingRequest = {
      id: 11,
      fromNodeId: 888,
      targetNodeId: nodeId,
      requestEventId: 'req-ev-002',
      source: `${DIRECTORY_API}/api/nodes/888`,
      status: 'pending',
    };

    const mockReverseConnection = {
      clientId: 'cb-client',
      clientSecret: Buffer.from('cb-secret').toString('base64'),
    };

    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'callback-token' }),
        })
        .mockResolvedValueOnce({ ok: true }); // callback POST
    });

    it('sends RequestRejectedEvent and marks row as rejected', async () => {
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(mockIncomingRequest)
        .mockResolvedValueOnce(mockReverseConnection);
      dbMocks.executors.execute.mockResolvedValueOnce(undefined); // UPDATE

      await service.reject(adminContext, nodeId, 11);

      const callbackCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('/3/events')
      );
      expect(callbackCall).toBeDefined();
      const body = JSON.parse(callbackCall![1].body);
      expect(body.type).toBe('org.wbcsd.pact.ProductFootprint.RequestRejectedEvent.3');
      expect(body.data.requestEventId).toBe('req-ev-002');
    });

    it('marks rejected even when callback returns non-OK (best-effort)', async () => {
      jest.clearAllMocks();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token' }),
        })
        .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'error' });

      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(mockIncomingRequest)
        .mockResolvedValueOnce(mockReverseConnection);
      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      await expect(service.reject(adminContext, nodeId, 11)).resolves.toBeUndefined();
    });

    it('marks rejected even when source URL is null', async () => {
      jest.clearAllMocks();
      const noSourceRequest = { ...mockIncomingRequest, source: null };

      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(noSourceRequest);
      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      await expect(service.reject(adminContext, nodeId, 11)).resolves.toBeUndefined();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when no pending incoming request found', async () => {
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      await expect(service.reject(adminContext, nodeId, 11)).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when user lacks permission', async () => {
      nodeService.get.mockResolvedValueOnce(mockFromNode as any);

      await expect(service.reject(otherOrgContext, nodeId, 11)).rejects.toThrow(ForbiddenError);
    });
  });
});
