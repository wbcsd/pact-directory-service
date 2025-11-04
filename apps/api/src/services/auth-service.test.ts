// unit test for auth-service.ts
import jwt from 'jsonwebtoken';
import { AuthService } from './auth-service';
import { UnauthorizedError } from '@src/common/errors';
import { createMockDatabase } from '../common/mock-utils';

jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let dbMocks: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    jest.resetAllMocks();
    
    // Create standardized database mocks
    dbMocks = createMockDatabase();
    authService = new AuthService(dbMocks.db as any);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('token', () => {
    const loginData = {
      client_id: 'client123',
      client_secret: 'secret123',
      network_key: 'networkXYZ',
    };

    it('should throw UnauthorizedError for invalid client_id', async () => {
      // clientOrganization not found
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(null) // client org
        .mockResolvedValueOnce({ id: 'n1' }); // network org dummy

      await expect(authService.token(loginData)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for invalid client_secret', async () => {
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce({
          id: 'c1',
          clientSecret: 'wrong-secret',
          networkKey: 'netA',
          organizationName: 'Client Org',
          email: 'client@test.com',
        }) // client org
        .mockResolvedValueOnce({
          id: 'n1',
          clientSecret: 'network-secret',
          networkKey: 'networkXYZ',
        }); // network org

      await expect(authService.token(loginData)).rejects.toThrow(UnauthorizedError);
      expect(dbMocks.executors.executeTakeFirst).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedError if no connection exists', async () => {
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce({
          id: 'c1',
          clientSecret: 'secret123',
          networkKey: 'netA',
          organizationName: 'Client Org',
          email: 'client@test.com',
        }) // client org
        .mockResolvedValueOnce({
          id: 'n1',
          clientSecret: 'network-secret',
          networkKey: 'networkXYZ',
        }) // network org
        .mockResolvedValueOnce(null); // no connection

      await expect(authService.token(loginData)).rejects.toThrow(UnauthorizedError);
      expect(dbMocks.executors.executeTakeFirst).toHaveBeenCalledTimes(3);
    });

    it('should return a token for valid credentials and connection', async () => {
      const mockToken = 'jwt-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce({
          id: 'c1',
          clientSecret: 'secret123',
          networkKey: 'netA',
          organizationName: 'Client Org',
          email: 'client@test.com',
        }) // client org
        .mockResolvedValueOnce({
          id: 'n1',
          clientSecret: 'network-secret',
          networkKey: 'networkXYZ',
        }) // network org
        .mockResolvedValueOnce({
          id: 'conn1',
          connectedCompanyOneId: 'c1',
          connectedCompanyTwoId: 'n1',
        }); // connection exists

      const result = await authService.token(loginData);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          iss: expect.any(String),
          sub: 'netA',
          aud: 'networkXYZ',
          name: 'Client Org',
          email: 'client@test.com',
        }),
        'network-secret'
      );
      expect(result).toEqual({
        access_token: mockToken,
        token_type: 'Bearer',
      });
    });
  });
});
