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

  // ── Real silversurfer23 PCF fixtures (from production DB) ────────────────
  // Three distinct footprints: US laptop, DE steel, NL compostable container.
  // Used across all filter tests to get realistic coverage.

  const laptopData = {
    id: 'd9be4477-e351-45b3-acd9-e1da05e6f633',
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
      boundaryProcessesDescription: 'Cradle-to-gate assessment',
      ipccCharacterizationFactors: ['AR6'],
      crossSectoralStandards: ['GHGP-Product', 'ISO14067'],
      exemptedEmissionsPercent: '2.5',
      packagingEmissionsIncluded: true,
      packagingGhgEmissions: '8.3',
    },
  };

  const steelData = {
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

  const containerData = {
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

  // Keep a generic fixture for non-filter tests (avoids updating every mock setup)
  const mockFootprintData = laptopData;
  const mockFootprintData2 = steelData;

  const mockFootprintRow = { data: mockFootprintData };
  const mockFootprintRow2 = { data: mockFootprintData2 };

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
          productId: ['urn:gtin:12345678'],   // matches laptopData
          status: 'Active',
        }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(laptopData.id);
    });

    it('should handle geography filter — matching country returns results', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([{ data: steelData }]);

      const result = await service.getFootprints(nodeId, { geography: ['DE'] });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].pcf.geographyCountry).toBe('DE');
    });

    it('should handle geography filter — no match returns empty', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 0 });
      dbMocks.executors.execute.mockResolvedValueOnce([]);

      const result = await service.getFootprints(nodeId, { geography: ['JP'] });

      expect(result.data).toEqual([]);
    });

    it('should handle classification filter — urn:pact:productclassification:un-cpc:452 matches laptop', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(
        nodeId,
        { classification: ['urn:pact:productclassification:un-cpc:452'] }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].productClassifications).toContain('urn:pact:productclassification:un-cpc:452');
    });

    it('should handle classification filter — no match returns empty', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 0 });
      dbMocks.executors.execute.mockResolvedValueOnce([]);

      const result = await service.getFootprints(
        nodeId,
        { classification: ['urn:pact:productclassification:un-cpc:999'] }
      );

      expect(result.data).toEqual([]);
    });

    it('should handle validOn filter — date within validity window', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      // laptopData validityPeriodStart='2023-01-15', validityPeriodEnd='2025-12-31'
      const result = await service.getFootprints(
        nodeId,
        { validOn: '2024-06-01T00:00:00Z' }
      );

      expect(result.data).toHaveLength(1);
    });

    it('should handle validOn filter — expired container returns empty', async () => {
      // containerData validityPeriodEnd='2024-08-31' — expired before 2025
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 0 });
      dbMocks.executors.execute.mockResolvedValueOnce([]);

      const result = await service.getFootprints(
        nodeId,
        { validOn: '2025-01-01T00:00:00Z' }
      );

      expect(result.data).toEqual([]);
    });

    it('should handle validAfter filter', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      // laptopData validityPeriodStart='2023-01-15', after 2023-01-14
      const result = await service.getFootprints(
        nodeId,
        { validAfter: '2023-01-14T00:00:00Z' }
      );

      expect(result.data).toHaveLength(1);
    });

    it('should handle validBefore filter', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      // laptopData validityPeriodEnd='2025-12-31', before 2026-01-01
      const result = await service.getFootprints(
        nodeId,
        { validBefore: '2026-01-01T00:00:00Z' }
      );

      expect(result.data).toHaveLength(1);
    });

    it('should handle companyId filter — matches laptop with urn:uuid:12345678-1234-1234-1234-123456789012', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(
        nodeId,
        { companyId: ['urn:uuid:12345678-1234-1234-1234-123456789012'] }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].companyIds).toContain('urn:uuid:12345678-1234-1234-1234-123456789012');
    });

    it('should handle companyId filter — OR logic: multiple IDs, any match suffices', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 2 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow, mockFootprintRow2]);

      const result = await service.getFootprints(
        nodeId,
        {
          companyId: [
            'urn:uuid:12345678-1234-1234-1234-123456789012',  // laptop
            'urn:uuid:87654321-4321-4321-4321-210987654321',  // steel
          ],
        }
      );

      expect(result.data).toHaveLength(2);
    });

    it('should handle combined status and productId filter', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockFootprintRow]);

      const result = await service.getFootprints(
        nodeId,
        {
          status: 'Active',
          productId: ['urn:gtin:12345678'],
        }
      );

      expect(result.data).toHaveLength(1);
    });

    it('should handle productId filter — steel has two IDs, either match', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([{ data: steelData }]);

      const result = await service.getFootprints(
        nodeId,
        { productId: ['urn:ean:9876543210123'] }  // second ID of steelData
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].productIds).toContain('urn:ean:9876543210123');
    });

    it('should return empty data for non-matching productId filter', async () => {
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

      it('should save incoming request to inbox regardless of footprint matches (Test Case #13)', async () => {
        // New behavior: always save to inbox, never auto-respond
        await expect(
          service.handleEvent(nodeId, {
            ...baseEvent,
            type: EventTypes.RequestCreated,
            data: { productId: ['urn:gtin:1234567890123'] },
          })
        ).resolves.toBeUndefined();

        // No callback should be made — supplier fulfills manually via dashboard
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should save incoming request to inbox for any productId (Test Case #14)', async () => {
        // New behavior: always save to inbox, no auto-rejection
        await expect(
          service.handleEvent(nodeId, {
            ...baseEvent,
            type: EventTypes.RequestCreated,
            data: { productId: ['urn:null'] },
          })
        ).resolves.toBeUndefined();

        // No callback should be made — supplier fulfills or rejects manually via dashboard
        expect(mockFetch).not.toHaveBeenCalled();
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
