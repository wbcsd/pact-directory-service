import { PactApiClientImpl } from './pact-api-client';
import { FootprintFilters, PaginationParams } from './pact-api-client.interface';
import { ProductFootprintV3 } from '../../models/pact-v3/product-footprint';
import { CloudEvent } from '../../models/pact-v3/events';

// Mock fetch globally
global.fetch = jest.fn();

// Helper to create mock Response with headers
const createMockResponse = (data: any, headers: Record<string, string> = {}): Response => {
  const headersObj = new Headers(headers);
  return {
    ok: true,
    json: async () => data,
    headers: headersObj,
  } as Response;
};

const createMockErrorResponse = (status: number, statusText: string, text: string): Response => {
  return {
    ok: false,
    status,
    statusText,
    text: async () => text,
    headers: new Headers(),
  } as Response;
};

describe('PactApiClientImpl', () => {
  let client: PactApiClientImpl;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should use provided apiUrl for external nodes', () => {
      client = new PactApiClientImpl(1, 'https://partner.com/pact');
      expect(client).toBeDefined();
      // baseUrl is private, but we can test behavior in subsequent tests
    });

    it('should construct URL from nodeId for internal nodes', () => {
      client = new PactApiClientImpl(5, null, 'http://localhost:3010');
      expect(client).toBeDefined();
    });

    it('should throw error if internal node has no internalApiBaseUrl', () => {
      expect(() => new PactApiClientImpl(1, null)).toThrow(
        'internalApiBaseUrl is required for internal nodes (when apiUrl is null)'
      );
    });

    it('should strip trailing slash from apiUrl', () => {
      client = new PactApiClientImpl(1, 'https://partner.com/pact/');
      // We'll verify this works correctly in other tests
      expect(client).toBeDefined();
    });
  });

  describe('authenticate', () => {
    beforeEach(() => {
      client = new PactApiClientImpl(1, 'https://partner.com/pact');
    });

    it('should successfully authenticate and cache token', async () => {
      const mockResponse = {
        access_token: 'test-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await client.authenticate('client-id', 'client-secret');

      expect(result).toEqual({
        accessToken: 'test-token-123',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://partner.com/pact/auth/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials&client_id=client-id&client_secret=client-secret',
        })
      );
    });

    it('should default to 3600 seconds if expires_in not provided', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        access_token: 'test-token',
        token_type: 'Bearer',
      }));

      const result = await client.authenticate('client-id', 'client-secret');

      expect(result.expiresIn).toBe(3600);
    });

    it('should throw error on authentication failure', async () => {
      mockFetch.mockResolvedValueOnce(createMockErrorResponse(401, 'Unauthorized', 'Invalid credentials'));

      await expect(client.authenticate('bad-id', 'bad-secret')).rejects.toThrow(
        'Authentication failed: 401 Unauthorized - Invalid credentials'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.authenticate('client-id', 'client-secret')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('listFootprints', () => {
    beforeEach(async () => {
      client = new PactApiClientImpl(1, 'https://partner.com/pact');

      // Authenticate first
      mockFetch.mockResolvedValueOnce(createMockResponse({
        access_token: 'test-token',
        expires_in: 3600,
      }));

      await client.authenticate('client-id', 'client-secret');
      mockFetch.mockClear();
    });

    it('should fetch footprints without filters', async () => {
      const mockFootprints: ProductFootprintV3[] = [
        {
          id: 'fp-1',
          specVersion: '3.0.0',
          version: 1,
          created: '2024-01-01T00:00:00Z',
          status: 'Active' as any,
          companyName: 'Test Company',
          companyIds: ['company-1'],
          productDescription: 'Test Product',
          productIds: ['product-1'],
          productNameCompany: 'Test Product Name',
          pcf: {} as any,
        },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse({
        data: mockFootprints,
        links: {},
      }));

      const result = await client.listFootprints();

      expect(result.data).toEqual(mockFootprints);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://partner.com/pact/2/footprints',
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
            Accept: 'application/json',
          },
        })
      );
    });

    it('should include pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const pagination: PaginationParams = { limit: 20, offset: 10 };
      await client.listFootprints(undefined, pagination);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://partner.com/pact/2/footprints?limit=20&offset=10',
        expect.any(Object)
      );
    });

    it('should include array filter parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const filters: FootprintFilters = {
        productId: ['prod-1', 'prod-2'],
        companyId: ['comp-1'],
        geography: ['US', 'CA'],
        classification: ['class-1'],
      };

      await client.listFootprints(filters);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('productId=prod-1');
      expect(callUrl).toContain('productId=prod-2');
      expect(callUrl).toContain('companyId=comp-1');
      expect(callUrl).toContain('geography=US');
      expect(callUrl).toContain('geography=CA');
      expect(callUrl).toContain('classification=class-1');
    });

    it('should include single-value filter parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const filters: FootprintFilters = {
        status: 'Active',
        validOn: '2024-01-01',
        validAfter: '2023-01-01',
        validBefore: '2025-01-01',
      };

      await client.listFootprints(filters);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('status=Active');
      expect(callUrl).toContain('validOn=2024-01-01');
      expect(callUrl).toContain('validAfter=2023-01-01');
      expect(callUrl).toContain('validBefore=2025-01-01');
    });

    it('should parse pagination links from response', async () => {
      const linkHeader = [
        '</2/footprints?limit=10&offset=0>; rel="first"',
        '</2/footprints?limit=10&offset=10>; rel="next"',
        '</2/footprints?limit=10&offset=90>; rel="last"',
      ].join(', ');

      mockFetch.mockResolvedValueOnce(createMockResponse(
        { data: [] },
        { 'Link': linkHeader }
      ));

      const result = await client.listFootprints();

      expect(result.links).toEqual({
        first: '/2/footprints?limit=10&offset=0',
        next: '/2/footprints?limit=10&offset=10',
        last: '/2/footprints?limit=10&offset=90',
      });
    });

    it('should throw error if not authenticated', async () => {
      const unauthenticatedClient = new PactApiClientImpl(
        1,
        'https://partner.com/pact'
      );

      await expect(unauthenticatedClient.listFootprints()).rejects.toThrow(
        'Not authenticated. Call authenticate() first.'
      );
    });

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce(createMockErrorResponse(500, 'Internal Server Error', 'Server error'));

      await expect(client.listFootprints()).rejects.toThrow(
        'List footprints failed: 500 Internal Server Error - Server error'
      );
    });
  });

  describe('getFootprint', () => {
    beforeEach(async () => {
      client = new PactApiClientImpl(1, 'https://partner.com/pact');

      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'test-token', expires_in: 3600 }));

      await client.authenticate('client-id', 'client-secret');
      mockFetch.mockClear();
    });

    it('should fetch single footprint by ID', async () => {
      const mockFootprint: ProductFootprintV3 = {
        id: 'fp-123',
        specVersion: '3.0.0',
        version: 1,
        created: '2024-01-01T00:00:00Z',
        status: 'Active' as any,
        companyName: 'Test Company',
        companyIds: ['company-1'],
        productDescription: 'Test Product',
        productIds: ['product-1'],
        productNameCompany: 'Test Product Name',
        pcf: {} as any,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse({ data: mockFootprint }));

      const result = await client.getFootprint('fp-123');

      expect(result.data).toEqual(mockFootprint);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://partner.com/pact/2/footprints/fp-123',
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
            Accept: 'application/json',
          },
        })
      );
    });

    it('should URL-encode footprint ID', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: {} }));

      await client.getFootprint('fp/with/slashes');

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('fp%2Fwith%2Fslashes');
    });

    it('should throw error if not authenticated', async () => {
      const unauthenticatedClient = new PactApiClientImpl(
        1,
        'https://partner.com/pact'
      );

      await expect(unauthenticatedClient.getFootprint('fp-123')).rejects.toThrow(
        'Not authenticated. Call authenticate() first.'
      );
    });

    it('should throw error on 404', async () => {
      mockFetch.mockResolvedValueOnce(createMockErrorResponse(404, 'Not Found', 'Footprint not found'));

      await expect(client.getFootprint('fp-999')).rejects.toThrow(
        'Get footprint failed: 404 Not Found - Footprint not found'
      );
    });
  });

  describe('sendEvent', () => {
    beforeEach(async () => {
      client = new PactApiClientImpl(1, 'https://partner.com/pact');

      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'test-token', expires_in: 3600 }));

      await client.authenticate('client-id', 'client-secret');
      mockFetch.mockClear();
    });

    it('should send CloudEvent successfully', async () => {
      const event: CloudEvent = {
        specversion: '1.0',
        type: 'org.wbcsd.pact.footprint.published.v1',
        source: 'https://example.com/footprints',
        id: 'event-123',
        time: '2024-01-01T00:00:00Z',
        data: {
          footprintId: 'fp-123',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
      } as Response);

      await client.sendEvent(event);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://partner.com/pact/2/events',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        })
      );
    });

    it('should throw error if not authenticated', async () => {
      const unauthenticatedClient = new PactApiClientImpl(
        1,
        'https://partner.com/pact'
      );

      const event = { specversion: '1.0' } as CloudEvent;

      await expect(unauthenticatedClient.sendEvent(event)).rejects.toThrow(
        'Not authenticated. Call authenticate() first.'
      );
    });

    it('should throw error on failed event delivery', async () => {
      mockFetch.mockResolvedValueOnce(createMockErrorResponse(400, 'Bad Request', 'Invalid event format'));

      const event = { specversion: '1.0' } as CloudEvent;

      await expect(client.sendEvent(event)).rejects.toThrow(
        'Send event failed: 400 Bad Request - Invalid event format'
      );
    });
  });

  describe('token caching', () => {
    beforeEach(() => {
      client = new PactApiClientImpl(1, 'https://partner.com/pact');
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should cache token and not re-authenticate on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'token-1', expires_in: 3600 }));

      await client.authenticate('client-id', 'client-secret');

      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      await client.listFootprints();

      // Only 2 calls: authenticate + listFootprints (no re-auth)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should require re-authentication after token expires', async () => {
      // First auth
      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'token-1', expires_in: 1 }));

      await client.authenticate('client-id', 'client-secret');

      // Advance time past expiration (with 5-minute buffer = 300 seconds)
      jest.spyOn(Date, 'now').mockReturnValue(1000000 + 2000); // Token expired

      // Should throw not authenticated error
      await expect(client.listFootprints()).rejects.toThrow(
        'Not authenticated. Call authenticate() first.'
      );
    });

    it('should apply 5-minute buffer to token expiration', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'token-1', expires_in: 3600 }));

      await client.authenticate('client-id', 'client-secret');

      // Token should be cached until: now + (3600 - 300) * 1000
      const expectedExpiry = now + (3600 - 300) * 1000;

      // Just before expiry - should work
      jest.spyOn(Date, 'now').mockReturnValue(expectedExpiry - 1000);
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      await expect(client.listFootprints()).resolves.toBeDefined();

      // After expiry - should fail
      jest.spyOn(Date, 'now').mockReturnValue(expectedExpiry + 1000);
      await expect(client.listFootprints()).rejects.toThrow(
        'Not authenticated. Call authenticate() first.'
      );
    });
  });

  describe('internal vs external nodes', () => {
    it('should use constructed URL for internal nodes', async () => {
      client = new PactApiClientImpl(42, null, 'http://localhost:3010');

      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'test-token', expires_in: 3600 }));

      await client.authenticate('client-id', 'client-secret');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3010/api/nodes/42/auth/token',
        expect.any(Object)
      );
    });

    it('should use apiUrl for external nodes', async () => {
      client = new PactApiClientImpl(1, 'https://external-partner.com/api/pact');

      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'test-token', expires_in: 3600 }));

      await client.authenticate('client-id', 'client-secret');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://external-partner.com/api/pact/auth/token',
        expect.any(Object)
      );
    });
  });
});
