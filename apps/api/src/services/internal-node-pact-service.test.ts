import { InternalNodePactService } from './internal-node-pact-service';
import { BadRequestError } from '@src/common/errors';
import { createMockDatabase } from '../common/mock-utils';
import { BaseEvent, EventTypes } from 'pact-data-model/v3_0';

// Mock logger to suppress output and allow spying
jest.mock('@src/common/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('@src/common/config', () => ({
  JWT_SECRET: 'test-secret',
  DIRECTORY_API: 'http://localhost:3010',
  CONFORMANCE_API_INTERNAL: 'https://conformance.example.com',
}));

// Mock global fetch for event callbacks
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('InternalNodePactService', () => {
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let service: InternalNodePactService;

  const nodeId = 1;

  const mockFootprintData = {
    id: 'b1f8c0d2-7c4e-4e67-9a9c-2e4c12345678',
    specVersion: '3.0.0',
    version: 1,
    created: '2023-01-15T10:15:30Z',
    status: 'Active',
    validityPeriodStart: '2023-01-15T10:15:30Z',
    validityPeriodEnd: '2025-12-31T00:00:00Z',
    companyName: 'Acme Corp',
    companyIds: ['urn:uuid:abc12345-6789-4def-0123-456789abcdef'],
    productDescription: 'Renewable Diesel',
    productIds: ['urn:gtin:1234567890123'],
    productClassifications: ['urn:eclass:0173-1#01-AAA123#005'],
    productNameCompany: 'Renewable Diesel',
    pcf: {
      declaredUnitOfMeasurement: 'liter',
      declaredUnitAmount: '1',
      geographyCountry: 'DE',
      referencePeriodStart: '2024-02-28T00:00:00+00:00',
      referencePeriodEnd: '2024-09-30T00:00:00+00:00',
      boundaryProcessesDescription: 'Cradle-to-gate',
      pcfExcludingBiogenicUptake: '77.0',
      pcfIncludingBiogenicUptake: '77.0',
      fossilCarbonContent: '11.72',
      ipccCharacterizationFactors: ['AR6'],
    },
  };

  const mockFootprintRow = {
    data: mockFootprintData,
  };

  const mockFootprintData2 = {
    ...mockFootprintData,
    id: 'c2e9d1f3-8d5f-5f78-0b0d-3f5e23456789',
    productDescription: 'Bio-Ethanol',
    productIds: ['urn:gtin:1234567890456'],
    companyIds: ['urn:uuid:other-company-id'],
    pcf: {
      ...mockFootprintData.pcf,
      geographyCountry: 'NL',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dbMocks = createMockDatabase();
    service = new InternalNodePactService(dbMocks.db as any);
  });

  describe('getFootprints', () => {
    it('should return footprints for a node (Test Case #4)', async () => {
      // Mock count query
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      // Mock data query
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(nodeId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(mockFootprintData.id);
      expect(result.data[0].specVersion).toBe('3.0.0');
    });

    it('should return empty array when no footprints exist', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 0 });
      dbMocks.executors.execute.mockResolvedValueOnce([]);

      const result = await service.getFootprints(nodeId);

      expect(result.data).toEqual([]);
      expect(result.links).toBeUndefined();
    });

    it('should apply pagination (Test Case #5)', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 25 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(nodeId, {}, { limit: 10, offset: 10 });

      expect(result.links).toBeDefined();
      expect(result.links!.first).toContain('offset=0');
      expect(result.links!.prev).toBeDefined();
      expect(result.links!.next).toBeDefined();
      expect(result.links!.last).toBeDefined();
    });

    it('should not return pagination links when all results fit on one page', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 3 });
      dbMocks.executors.execute.mockResolvedValueOnce([
        mockFootprintRow,
        { data: mockFootprintData2 },
      ]);

      const result = await service.getFootprints(nodeId, {}, { limit: 10, offset: 0 });

      expect(result.links).toBeUndefined();
    });

    it('should pass filter params to the query builder', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(
        nodeId,
        {
          productId: ['urn:gtin:1234567890123'],
          status: 'Active',
        }
      );

      expect(result.data).toHaveLength(1);
    });

    it('should handle geography filter', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(nodeId, { geography: ['DE'] });

      expect(result.data).toHaveLength(1);
    });

    it('should handle classification filter', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(
        nodeId,
        { classification: ['urn:eclass:0173-1#01-AAA123#005'] }
      );

      expect(result.data).toHaveLength(1);
    });

    it('should handle validOn filter', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(
        nodeId,
        { validOn: '2023-01-15T10:15:30Z' }
      );

      expect(result.data).toHaveLength(1);
    });

    it('should handle validAfter filter', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(
        nodeId,
        { validAfter: '2023-01-14T10:15:30Z' }
      );

      expect(result.data).toHaveLength(1);
    });

    it('should handle validBefore filter', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(
        nodeId,
        { validBefore: '2026-01-01T00:00:00Z' }
      );

      expect(result.data).toHaveLength(1);
    });

    it('should handle companyId filter with OR logic (Test Case #29)', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(
        nodeId,
        {
          companyId: [
            'urn:uuid:abc12345-6789-4def-0123-456789abcdef',
            'urn:uuid:other-company',
            'urn:uuid:another-company',
          ],
        }
      );

      expect(result.data).toHaveLength(1);
    });

    it('should handle combined status and productId filter (Test Case #28)', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(
        nodeId,
        {
          status: 'Active',
          productId: ['urn:gtin:1234567890123'],
        }
      );

      expect(result.data).toHaveLength(1);
    });

    it('should return empty data for non-matching negative filter (Test Case #30-39)', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 0 });
      dbMocks.executors.execute.mockResolvedValueOnce([]);

      const result = await service.getFootprints(
        nodeId,
        { productId: ['urn:bogus:product:nonexistent123'] }
      );

      expect(result.data).toEqual([]);
    });
  });

  describe('getFootprintById', () => {
    it('should return a footprint by ID (Test Case #3)', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockFootprintRow);

      const result = await service.getFootprintById(nodeId, mockFootprintData.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(mockFootprintData.id);
      expect(result!.specVersion).toBe('3.0.0');
    });

    it('should return null for non-existent footprint (Test Case #8)', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);

      const result = await service.getFootprintById(nodeId, 'non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('handleEvent', () => {
    const baseEvent = {
      specversion: '1.0',
      id: 'test-event-123',
      source: 'https://webhook.example.com',
      time: '2023-05-19T10:30:00Z',
    };

    describe('PublishedEvent (Test Case #15)', () => {
      it('should acknowledge a PublishedEvent', async () => {
        await expect(
          service.handleEvent(nodeId, {
            ...baseEvent,
            type: EventTypes.Published,
            data: { pfIds: ['3a6c14a7-4deb-498a-b5ea-16ce2535b576'] },
          })
        ).resolves.toBeUndefined();
      });

      it('should reject a PublishedEvent with non-UUID pfIds (Test Case #40)', async () => {
        await expect(
          service.handleEvent(nodeId, {
            ...baseEvent,
            type: EventTypes.Published,
            data: { pfIds: ['urn:gtin:4712345060507'] },
          })
        ).rejects.toThrow('Invalid pfId format');
      });

      it('should reject a PublishedEvent with missing pfIds', async () => {
        await expect(
          service.handleEvent(nodeId, {
            ...baseEvent,
            type: EventTypes.Published,
            data: {},
          })
        ).rejects.toThrow('PublishedEvent data must contain a non-empty pfIds array');
      });
    });

    describe('RequestCreatedEvent (Test Case #12)', () => {
      it('should acknowledge and trigger async callback for RequestCreatedEvent', async () => {
        // Mock: no matching footprints found
        dbMocks.executors.execute.mockResolvedValueOnce([]);
        // Mock: no outgoing connection for callback auth
        dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(null);
        // Mock the fetch for callback
        mockFetch.mockResolvedValueOnce({ ok: true });

        await expect(
          service.handleEvent(nodeId, {
            ...baseEvent,
            type: EventTypes.RequestCreated,
            data: {
              productId: ['urn:gtin:1234567890123'],
              comment: 'Please send PCF data for this year.',
            },
          })
        ).resolves.toBeUndefined();

        // Give the fire-and-forget promise time to resolve
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      it('should send RequestFulfilledEvent when matching footprints are found (Test Case #13)', async () => {
        // Mock: matching footprint found
        dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);
        // Mock: outgoing connection for callback auth
        dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
          clientId: 'test-client',
          clientSecret: Buffer.from('test-secret').toString('base64'),
        });
        // Mock: auth token response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'callback-token' }),
        });
        // Mock: callback POST
        mockFetch.mockResolvedValueOnce({ ok: true });

        await service.handleEvent(nodeId, {
          ...baseEvent,
          type: EventTypes.RequestCreated,
          data: { productId: ['urn:gtin:1234567890123'] },
        });

        // Give the fire-and-forget promise time to resolve
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify the callback was made
        const callbackCall = mockFetch.mock.calls.find(
          (call) => call[0].includes('/3/events')
        );
        expect(callbackCall).toBeDefined();
        if (callbackCall && callbackCall[1]) {
          const body = JSON.parse(callbackCall[1].body);
          expect(body.type).toBe(EventTypes.RequestFulfilled);
          expect(body.data.requestEventId).toBe('test-event-123');
          expect(body.data.pfs).toHaveLength(1);
        }
      });

      it('should send RequestRejectedEvent for non-existent productId (Test Case #14)', async () => {
        // Mock: no matching footprints
        dbMocks.executors.execute.mockResolvedValueOnce([]);
        // Mock: outgoing connection for callback auth
        dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
          clientId: 'test-client',
          clientSecret: Buffer.from('test-secret').toString('base64'),
        });
        // Mock: auth token response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'callback-token' }),
        });
        // Mock: callback POST
        mockFetch.mockResolvedValueOnce({ ok: true });

        await service.handleEvent(nodeId, {
          ...baseEvent,
          type: EventTypes.RequestCreated,
          data: { productId: ['urn:null'] },
        });

        // Give the fire-and-forget promise time to resolve
        await new Promise((resolve) => setTimeout(resolve, 100));

        const callbackCall = mockFetch.mock.calls.find(
          (call) => call[0].includes('/3/events')
        );
        expect(callbackCall).toBeDefined();
        if (callbackCall && callbackCall[1]) {
          const body = JSON.parse(callbackCall[1].body);
          expect(body.type).toBe(EventTypes.RequestRejected);
          expect(body.data.requestEventId).toBe('test-event-123');
          expect(body.data.error.code).toBe('NotFound');
        }
      });
    });

    describe('RequestFulfilledEvent', () => {
      it('should acknowledge a RequestFulfilledEvent', async () => {
        await expect(
          service.handleEvent(nodeId, {
            ...baseEvent,
            type: EventTypes.RequestFulfilled,
            data: {
              requestEventId: 'original-request-id',
              pfs: [mockFootprintData],
            },
          })
        ).resolves.toBeUndefined();
      });
    });

    describe('RequestRejectedEvent', () => {
      it('should acknowledge a RequestRejectedEvent', async () => {
        await expect(
          service.handleEvent(nodeId, {
            ...baseEvent,
            type: EventTypes.RequestRejected,
            data: {
              requestEventId: 'original-request-id',
              error: { code: 'NotFound', message: 'Not found' },
            },
          })
        ).resolves.toBeUndefined();
      });
    });

    describe('unsupported event type', () => {
      it('should throw BadRequestError for unsupported event type', async () => {
        await expect(
          service.handleEvent(nodeId, {
            ...baseEvent,
            type: 'org.wbcsd.pact.ProductFootprint.UnknownEvent.3',
          } as BaseEvent)
        ).rejects.toThrow(BadRequestError);
      });
    });
  });

  describe('buildLinkHeader', () => {
    it('should return undefined when no links', () => {
      expect(service.buildLinkHeader(undefined, 'http://example.com')).toBeUndefined();
    });

    it('should build Link header with all link types', () => {
      const links = {
        first: '?limit=10&offset=0',
        prev: '?limit=10&offset=0',
        next: '?limit=10&offset=20',
        last: '?limit=10&offset=40',
      };

      const header = service.buildLinkHeader(links, 'http://example.com/3/footprints');

      expect(header).toContain('rel="first"');
      expect(header).toContain('rel="prev"');
      expect(header).toContain('rel="next"');
      expect(header).toContain('rel="last"');
    });

    it('should build Link header with only next/last when at start', () => {
      const links = {
        next: '?limit=10&offset=10',
        last: '?limit=10&offset=40',
      };

      const header = service.buildLinkHeader(links, 'http://example.com/3/footprints');

      expect(header).toContain('rel="next"');
      expect(header).toContain('rel="last"');
      expect(header).not.toContain('rel="first"');
      expect(header).not.toContain('rel="prev"');
    });
  });
});
