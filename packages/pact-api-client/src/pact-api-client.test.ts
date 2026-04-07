import { PactApiClient, FootprintFilters, PaginationParams, EventTypes } from './pact-api-client';
import { ProductFootprint } from 'pact-data-model/v3_0';

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
  let client: PactApiClient;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should accept a base URL and credentials', () => {
      client = new PactApiClient('https://partner.com/pact', 'client-id', 'client-secret');
      expect(client).toBeDefined();
    });

    it('should strip trailing slash from baseUrl', () => {
      client = new PactApiClient('https://partner.com/pact/', 'client-id', 'client-secret');
      expect(client).toBeDefined();
    });

    it('should accept an optional source for CloudEvents', () => {
      client = new PactApiClient(
        'https://partner.com/pact',
        'client-id',
        'client-secret',
        'https://my-node.example.com'
      );
      expect(client).toBeDefined();
    });
  });

  describe('listFootprints', () => {
    beforeEach(() => {
      client = new PactApiClient('https://partner.com/pact', 'client-id', 'client-secret');
      // Queue the auth response — consumed automatically on the first API call
      mockFetch.mockResolvedValueOnce(createMockResponse({
        access_token: 'test-token',
        expires_in: 3600,
      }));
    });

    it('should fetch footprints without filters', async () => {
      const mockFootprints: ProductFootprint[] = [
        {
          id: 'fp-1',
          specVersion: '3.0.0',
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
      // First call is auth, second is the actual request
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
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

      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
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

      const callUrl = mockFetch.mock.calls[1][0] as string;
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

      // Call index 1 is auth, index 2 (index 1 in mock.calls) is the actual request
      const callUrl = mockFetch.mock.calls[1][0] as string;
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

    it('should throw error on authentication failure', async () => {
      // Override both mock slots: auth first (error), then the actual call won't happen
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce(createMockErrorResponse(401, 'Unauthorized', 'Invalid credentials'));

      await expect(client.listFootprints()).rejects.toThrow(
        'Authentication failed: 401 Unauthorized - Invalid credentials'
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
    beforeEach(() => {
      client = new PactApiClient('https://partner.com/pact', 'client-id', 'client-secret');
      // Queue auth response — consumed automatically on the first API call
      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'test-token', expires_in: 3600 }));
    });

    it('should fetch single footprint by ID', async () => {
      const mockFootprint: ProductFootprint = {
        id: 'fp-123',
        specVersion: '3.0.0',
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
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
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

      const callUrl = mockFetch.mock.calls[1][0] as string;
      expect(callUrl).toContain('fp%2Fwith%2Fslashes');
    });

    it('should throw error on authentication failure', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce(createMockErrorResponse(401, 'Unauthorized', 'Invalid credentials'));

      await expect(client.getFootprint('fp-123')).rejects.toThrow(
        'Authentication failed: 401 Unauthorized - Invalid credentials'
      );
    });

    it('should throw error on 404', async () => {
      mockFetch.mockResolvedValueOnce(createMockErrorResponse(404, 'Not Found', 'Footprint not found'));

      await expect(client.getFootprint('fp-999')).rejects.toThrow(
        'Get footprint failed: 404 Not Found - Footprint not found'
      );
    });
  });

  describe('event methods', () => {
    beforeEach(() => {
      client = new PactApiClient(
        'https://partner.com/pact',
        'client-id',
        'client-secret',
        'https://my-node.example.com'
      );
      // Queue auth response — consumed automatically on first event call
      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'test-token', expires_in: 3600 }));
    });

    const mockEventResponse = (): void => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
      } as Response);
    };

    it('should send a requestFootprint event', async () => {
      mockEventResponse();

      await client.requestFootprint(['prod-1', 'prod-2'], 'please send');

      const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(url).toBe('https://partner.com/pact/2/events');
      const body = JSON.parse(init.body as string);
      expect(body.type).toBe(EventTypes.RequestCreated);
      expect(body.source).toBe('https://my-node.example.com');
      expect(body.data).toEqual({ productId: ['prod-1', 'prod-2'], comment: 'please send' });
      expect(body.specversion).toBe('1.0');
      expect(body.id).toBeDefined();
      expect(body.time).toBeDefined();
    });

    it('should omit comment from requestFootprint when not provided', async () => {
      mockEventResponse();

      await client.requestFootprint(['prod-1']);

      const body = JSON.parse((mockFetch.mock.calls[1][1] as RequestInit).body as string);
      expect(body.data).toEqual({ productId: ['prod-1'] });
      expect(body.data.comment).toBeUndefined();
    });

    it('should send a fulfillFootprint event', async () => {
      mockEventResponse();
      const footprints = [{ id: 'fp-1' }] as any[];

      await client.fulfillFootprint('req-event-id', footprints);

      const body = JSON.parse((mockFetch.mock.calls[1][1] as RequestInit).body as string);
      expect(body.type).toBe(EventTypes.RequestFulfilled);
      expect(body.data).toEqual({ requestEventId: 'req-event-id', pfs: footprints });
    });

    it('should send a rejectFootprint event', async () => {
      mockEventResponse();

      await client.rejectFootprint('req-event-id', { code: 'AccessDenied', message: 'Not allowed' });

      const body = JSON.parse((mockFetch.mock.calls[1][1] as RequestInit).body as string);
      expect(body.type).toBe(EventTypes.RequestRejected);
      expect(body.data).toEqual({
        requestEventId: 'req-event-id',
        error: { code: 'AccessDenied', message: 'Not allowed' },
      });
    });

    it('should send a publishFootprint event', async () => {
      mockEventResponse();

      await client.publishFootprint(['fp-1', 'fp-2']);

      const body = JSON.parse((mockFetch.mock.calls[1][1] as RequestInit).body as string);
      expect(body.type).toBe(EventTypes.Published);
      expect(body.data).toEqual({ pfIds: ['fp-1', 'fp-2'] });
    });

    it('should throw error on failed event delivery', async () => {
      mockFetch.mockResolvedValueOnce(createMockErrorResponse(400, 'Bad Request', 'Invalid event format'));

      await expect(client.publishFootprint(['fp-1'])).rejects.toThrow(
        'Send event failed: 400 Bad Request - Invalid event format'
      );
    });

    it('should use default source (baseUrl) when no source provided', async () => {
      const clientWithoutSource = new PactApiClient(
        'https://partner.com/pact',
        'client-id',
        'client-secret'
      );
      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'token', expires_in: 3600 }));
      mockEventResponse();

      await clientWithoutSource.publishFootprint(['fp-1']);

      const body = JSON.parse((mockFetch.mock.calls[1][1] as RequestInit).body as string);
      expect(body.source).toBe('https://partner.com/pact');
    });
  });

  describe('token caching and auto-refresh', () => {
    beforeEach(() => {
      client = new PactApiClient('https://partner.com/pact', 'client-id', 'client-secret');
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should authenticate once and cache token for subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'token-1', expires_in: 3600 }));
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      await client.listFootprints();
      await client.listFootprints();

      // Only 3 calls: 1 auth + 2 listFootprints (no re-auth)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should re-authenticate automatically when token expires', async () => {
      const now = 1000000;

      // First auth, short-lived token
      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'token-1', expires_in: 1 }));
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      await client.listFootprints();

      // Advance time past expiration (expires_in=1, buffer=300 → expiry = now + (1-300)*1000 which is already past)
      jest.spyOn(Date, 'now').mockReturnValue(now + 2000);

      // Second auth + second list
      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'token-2', expires_in: 3600 }));
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      await client.listFootprints();

      // Total: 2 auths + 2 lists = 4 calls
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        'https://partner.com/pact/auth/token',
        expect.any(Object)
      );
    });

    it('should apply 5-minute buffer to token expiration', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'token-1', expires_in: 3600 }));
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      await client.listFootprints();

      // Token should be cached until: now + (3600 - 300) * 1000
      const expectedExpiry = now + (3600 - 300) * 1000;

      // Just before expiry — should reuse cached token (no new auth call)
      jest.spyOn(Date, 'now').mockReturnValue(expectedExpiry - 1000);
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));
      await client.listFootprints();
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 auth + 2 list

      // After expiry — should trigger re-auth
      jest.spyOn(Date, 'now').mockReturnValue(expectedExpiry + 1000);
      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'token-2', expires_in: 3600 }));
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));
      await client.listFootprints();
      expect(mockFetch).toHaveBeenCalledTimes(5); // + 1 re-auth + 1 list
    });
  });

  describe('base URL handling', () => {
    it('should construct the auth URL from the provided base URL', async () => {
      client = new PactApiClient(
        'http://localhost:3010/api/nodes/42',
        'client-id',
        'client-secret'
      );

      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'test-token', expires_in: 3600 }));
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      await client.listFootprints();

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:3010/api/nodes/42/auth/token',
        expect.any(Object)
      );
    });

    it('should strip trailing slash from base URL', async () => {
      client = new PactApiClient(
        'https://external-partner.com/api/pact/',
        'client-id',
        'client-secret'
      );

      mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: 'test-token', expires_in: 3600 }));
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      await client.listFootprints();

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://external-partner.com/api/pact/auth/token',
        expect.any(Object)
      );
    });
  });
});
