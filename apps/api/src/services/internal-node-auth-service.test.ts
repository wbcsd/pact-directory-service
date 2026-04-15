import jwt from 'jsonwebtoken';
import { InternalNodeAuthService } from './internal-node-auth-service';
import { UnauthorizedError, NotFoundError, BadRequestError } from '@src/common/errors';
import { NodeService } from './node-service';
import { NodeConnectionService } from './node-connection-service';

jest.mock('jsonwebtoken');
jest.mock('@src/common/config', () => ({
  JWT_SECRET: 'test-secret',
}));

const mockNodeService = {
  getById: jest.fn(),
} as unknown as jest.Mocked<NodeService>;

const mockNodeConnectionService = {
  verifyConnectionCredentials: jest.fn(),
} as unknown as jest.Mocked<NodeConnectionService>;

describe('InternalNodeAuthService', () => {
  let authService: InternalNodeAuthService;

  beforeEach(() => {
    jest.resetAllMocks();
    authService = new InternalNodeAuthService(
      mockNodeService,
      mockNodeConnectionService
    );
  });

  describe('generateToken', () => {
    const mockConnection = {
      id: 10,
      fromNodeId: 2,
      fromNodeOrganizationId: 5,
      status: 'accepted',
    };

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1000000000000);
      process.env.BASE_URL = 'http://localhost:3010';
    });

    afterEach(() => {
      jest.restoreAllMocks();
      delete process.env.BASE_URL;
    });

    it('should throw NotFoundError if node does not exist', async () => {
      (mockNodeService.getById as jest.Mock).mockRejectedValueOnce(
        new NotFoundError('Node not found')
      );

      await expect(
        authService.generateToken(999, 'client-id', 'client-secret')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if node is not internal type', async () => {
      (mockNodeService.getById as jest.Mock).mockResolvedValueOnce({
        id: 1,
        type: 'external',
      });

      await expect(
        authService.generateToken(1, 'client-123', 'secret-456')
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw UnauthorizedError if credentials are invalid', async () => {
      (mockNodeService.getById as jest.Mock).mockResolvedValueOnce({
        id: 1,
        type: 'internal',
      });
      (mockNodeConnectionService.verifyConnectionCredentials as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        authService.generateToken(1, 'invalid-client', 'invalid-secret')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should generate valid JWT token for valid credentials', async () => {
      const mockToken = 'mock-jwt-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      (mockNodeService.getById as jest.Mock).mockResolvedValueOnce({
        id: 1,
        type: 'internal',
      });
      (mockNodeConnectionService.verifyConnectionCredentials as jest.Mock).mockResolvedValueOnce(mockConnection);

      const result = await authService.generateToken(1, 'client-123', 'secret-456');

      expect(result).toEqual({
        access_token: mockToken,
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          nodeId: 2,
          connectionId: 10,
          organizationId: 5,
          sub: '2',
          iss: 'http://localhost:3010',
          aud: 'node:1',
          iat: 1000000000,
          exp: 1000003600,
        },
        'test-secret',
        { algorithm: 'HS256' }
      );
    });

    it('should use default issuer when BASE_URL is not set', async () => {
      delete process.env.BASE_URL;
      const mockToken = 'mock-jwt-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      (mockNodeService.getById as jest.Mock).mockResolvedValueOnce({
        id: 1,
        type: 'internal',
      });
      (mockNodeConnectionService.verifyConnectionCredentials as jest.Mock).mockResolvedValueOnce(mockConnection);

      await authService.generateToken(1, 'client-123', 'secret-456');

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          iss: 'http://localhost:3010',
        }),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('verifyToken', () => {
    const validPayload = {
      nodeId: 2,
      connectionId: 10,
      organizationId: 5,
      sub: '2',
      iss: 'http://localhost:3010',
      aud: 'node:1',
      iat: 1000000000,
      exp: 1000003600,
    };

    beforeEach(() => {
      process.env.BASE_URL = 'http://localhost:3010';
    });

    afterEach(() => {
      delete process.env.BASE_URL;
    });

    it('should successfully verify valid token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue(validPayload);

      const result = await authService.verifyToken('valid-token', 1);

      expect(result).toEqual(validPayload);
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret', {
        algorithms: ['HS256'],
        audience: 'node:1',
        issuer: 'http://localhost:3010',
      });
    });

    it('should throw UnauthorizedError for invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyToken('invalid-token', 1)).rejects.toThrow(
        UnauthorizedError
      );
      await expect(authService.verifyToken('invalid-token', 1)).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should throw UnauthorizedError for expired token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await expect(authService.verifyToken('expired-token', 1)).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('should throw UnauthorizedError for token with wrong audience', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('jwt audience invalid');
      });

      await expect(authService.verifyToken('token', 1)).rejects.toThrow(UnauthorizedError);
    });

    it('should use default issuer when BASE_URL is not set', async () => {
      delete process.env.BASE_URL;
      (jwt.verify as jest.Mock).mockReturnValue(validPayload);

      await authService.verifyToken('token', 1);

      expect(jwt.verify).toHaveBeenCalledWith(
        'token',
        'test-secret',
        expect.objectContaining({
          issuer: 'http://localhost:3010',
        })
      );
    });
  });
});
