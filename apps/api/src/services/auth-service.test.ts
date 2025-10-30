// unit test for auth-service.ts
import { Kysely } from 'kysely';
import jwt from 'jsonwebtoken';
import { Database } from '../database/types';
import { AuthService } from './auth-service';
import { UnauthorizedError } from '@src/common/errors';

jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let db: jest.Mocked<Kysely<Database>>;
  let authService: AuthService;

  // Mock query builder chains used by Kysely
  const selectFromMock = jest.fn();
  const leftJoinMock = jest.fn();
  const selectMock = jest.fn();
  const selectAllMock = jest.fn();
  const whereMock = jest.fn();
  const executeTakeFirstMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    // Build a mock query chain
    selectFromMock.mockReturnValue({
      leftJoin: leftJoinMock,
      select: selectMock,
      selectAll: selectAllMock,
      where: whereMock,
    });

    leftJoinMock.mockReturnValue({
      select: selectMock,
      selectAll: selectAllMock,
      where: whereMock,
    });

    selectMock.mockReturnValue({ where: whereMock });
    selectAllMock.mockReturnValue({ where: whereMock });
    whereMock.mockReturnValue({ where: whereMock, executeTakeFirst: executeTakeFirstMock });

    db = {
      selectFrom: selectFromMock,
    } as unknown as jest.Mocked<Kysely<Database>>;

    // @ts-expect-error
    authService = new AuthService(db);
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
      executeTakeFirstMock
        .mockResolvedValueOnce(null) // client org
        .mockResolvedValueOnce({ id: 'n1' }); // network org dummy

      await expect(authService.token(loginData)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for invalid client_secret', async () => {
      executeTakeFirstMock
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
      expect(executeTakeFirstMock).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedError if no connection exists', async () => {
      executeTakeFirstMock
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
      expect(executeTakeFirstMock).toHaveBeenCalledTimes(3);
    });

    it('should return a token for valid credentials and connection', async () => {
      const mockToken = 'jwt-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      executeTakeFirstMock
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
