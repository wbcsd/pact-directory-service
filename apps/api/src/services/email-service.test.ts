import { EmailService } from './email-service';
import config from '@src/common/config';
import logger from '@src/common/logger';
import Mailjet from 'node-mailjet';

// Mock dependencies
jest.mock('node-mailjet');
jest.mock('@src/common/config');
jest.mock('@src/common/logger');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockRequest: jest.Mock;
  let mockPost: jest.Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock implementations
    mockRequest = jest.fn().mockResolvedValue({ body: {} });
    mockPost = jest.fn().mockReturnValue({ request: mockRequest });
    (Mailjet.apiConnect as jest.Mock) = jest.fn().mockReturnValue({ post: mockPost });

    // Mock config values
    (config as any).MAIL_API_KEY = 'test-api-key';
    (config as any).MAIL_API_SECRET = 'test-api-secret';
    (config as any).MAIL_FROM_EMAIL = 'noreply@test.com';
    (config as any).MAIL_FROM_NAME = 'PACT Network';
    (config as any).NODE_ENV = 'test';

    // Mock logger methods
    (logger.debug as jest.Mock) = jest.fn();
    (logger.info as jest.Mock) = jest.fn();
    (logger.error as jest.Mock) = jest.fn();
    (logger.warn as jest.Mock) = jest.fn();

    emailService = new EmailService();
  });

  describe('constructor', () => {
    it('should create a Mailjet client', () => {
      expect(Mailjet.apiConnect).toHaveBeenCalledWith('test-api-key', 'test-api-secret');
    });
  });

  describe('sendPasswordSetupEmail', () => {
    const mockParams = {
      to: 'user@example.com',
      name: 'John Doe',
      organizationName: 'Test Org',
      setupUrl: 'https://example.com/setup/token123',
    };

    it('should send password setup email with correct parameters', async () => {
      await emailService.sendPasswordSetupEmail(mockParams);

      expect(mockPost).toHaveBeenCalledWith('send', { version: 'v3.1' });
      expect(mockRequest).toHaveBeenCalledTimes(1);
      
      const sentPayload = mockRequest.mock.calls[0][0];
      const message = sentPayload.Messages[0];
      expect(message.To[0].Email).toBe(mockParams.to);
      expect(message.From.Email).toBe('noreply@test.com');
      expect(message.Subject).toBe(`Set your password for ${mockParams.organizationName}`);
    });

    it('should include user name in email content', async () => {
      await emailService.sendPasswordSetupEmail(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.HTMLPart).toContain(mockParams.name);
    });

    it('should include organization name in email content', async () => {
      await emailService.sendPasswordSetupEmail(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.HTMLPart).toContain(mockParams.organizationName);
    });

    it('should include setup URL in email content', async () => {
      await emailService.sendPasswordSetupEmail(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.HTMLPart).toContain(mockParams.setupUrl);
    });

    it('should mention 72 hour expiration in email content', async () => {
      await emailService.sendPasswordSetupEmail(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.HTMLPart).toContain('72 hours');
    });

    it('should handle Mailjet errors', async () => {
      const error = new Error('Mailjet error');
      mockRequest.mockRejectedValueOnce(error);

      await expect(emailService.sendPasswordSetupEmail(mockParams)).rejects.toThrow('Mailjet error');
    });
  });

  describe('sendEmailVerification', () => {
    const mockParams = {
      to: 'user@example.com',
      name: 'Jane Smith',
      organizationName: 'Test Company',
      verificationUrl: 'https://example.com/verify/token456',
      setupUrl: 'https://example.com/setup/token123',
    };

    it('should send email verification with correct parameters', async () => {
      await emailService.sendEmailVerification(mockParams);

      expect(mockPost).toHaveBeenCalledWith('send', { version: 'v3.1' });
      expect(mockRequest).toHaveBeenCalledTimes(1);
      
      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.To[0].Email).toBe(mockParams.to);
      expect(message.From.Email).toBe('noreply@test.com');
      expect(message.Subject).toBe(`Please verify your email address for ${mockParams.organizationName}`);
    });

    it('should include user name in email content', async () => {
      await emailService.sendEmailVerification(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.HTMLPart).toContain(mockParams.name);
    });

    it('should include verification URL in email content', async () => {
      await emailService.sendEmailVerification(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.HTMLPart).toContain(mockParams.verificationUrl);
    });

    it('should mention 24 hour expiration in email content', async () => {
      await emailService.sendEmailVerification(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.HTMLPart).toContain('24 hours');
    });

    it('should handle Mailjet errors', async () => {
      const error = new Error('Mailjet error');
      mockRequest.mockRejectedValueOnce(error);

      await expect(emailService.sendEmailVerification(mockParams)).rejects.toThrow('Mailjet error');
    });
  });

  describe('sendConnectionRequestEmail', () => {
    const mockParams = {
      to: 'contact@example.com',
      name: 'Bob Johnson',
      organizationName: 'Partner Org',
    };

    it('should send connection request email with correct parameters', async () => {
      await emailService.sendConnectionRequestEmail(mockParams);

      expect(mockPost).toHaveBeenCalledWith('send', { version: 'v3.1' });
      expect(mockRequest).toHaveBeenCalledTimes(1);
      
      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.To[0].Email).toBe(mockParams.to);
      expect(message.From.Email).toBe('noreply@test.com');
      expect(message.Subject).toBe('Connection Request from PACT Network');
    });

    it('should include user name in email content', async () => {
      await emailService.sendConnectionRequestEmail(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.TextPart).toContain(mockParams.name);
      expect(message.HTMLPart).toContain(mockParams.name);
    });

    it('should include organization name in email content', async () => {
      await emailService.sendConnectionRequestEmail(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.TextPart).toContain(mockParams.organizationName);
      expect(message.HTMLPart).toContain(mockParams.organizationName);
    });

    it('should include management link in HTML content', async () => {
      await emailService.sendConnectionRequestEmail(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.HTMLPart).toContain('https://pact-directory-portal.onrender.com/manage-connections');
    });

    it('should log success message after sending', async () => {
      await emailService.sendConnectionRequestEmail(mockParams);

      expect(logger.info).toHaveBeenCalledWith(`Email sent to ${mockParams.name}`);
    });

    it('should throw Mailjet errors', async () => {
      const error = new Error('Mailjet error');
      mockRequest.mockRejectedValueOnce(error);

      await expect(emailService.sendConnectionRequestEmail(mockParams)).rejects.toThrow('Mailjet error');
    });
  });

  describe('sendPasswordResetEmail', () => {
    const mockParams = {
      to: 'user@example.com',
      name: 'Alice Brown',
      resetUrl: 'https://example.com/reset/token789',
    };

    it('should send password reset email with correct parameters', async () => {
      await emailService.sendPasswordResetEmail(mockParams);

      expect(mockPost).toHaveBeenCalledWith('send', { version: 'v3.1' });
      expect(mockRequest).toHaveBeenCalledTimes(1);
      
      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.To[0].Email).toBe(mockParams.to);
      expect(message.From.Email).toBe('noreply@test.com');
      expect(message.Subject).toBe('Password Reset Request - PACT Network');
    });

    it('should include both text and HTML content', async () => {
      await emailService.sendPasswordResetEmail(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.TextPart).toBeDefined();
      expect(message.HTMLPart).toBeDefined();
    });

    it('should include user name in email content', async () => {
      await emailService.sendPasswordResetEmail(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.TextPart).toContain(mockParams.name);
      expect(message.HTMLPart).toContain(mockParams.name);
    });

    it('should include reset URL in email content', async () => {
      await emailService.sendPasswordResetEmail(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.TextPart).toContain(mockParams.resetUrl);
      expect(message.HTMLPart).toContain(mockParams.resetUrl);
    });

    it('should mention 15 minute expiration in email content', async () => {
      await emailService.sendPasswordResetEmail(mockParams);

      const message = mockRequest.mock.calls[0][0].Messages[0];
      expect(message.TextPart).toContain('15 minutes');
      expect(message.HTMLPart).toContain('15 minutes');
    });

    it('should log success message after sending', async () => {
      await emailService.sendPasswordResetEmail(mockParams);

      expect(logger.info).toHaveBeenCalledWith(`Password reset email sent to ${mockParams.to}`);
    });

    it('should throw Mailjet errors', async () => {
      const error = new Error('Mailjet error');
      mockRequest.mockRejectedValueOnce(error);

      await expect(emailService.sendPasswordResetEmail(mockParams)).rejects.toThrow('Mailjet error');
    });
  });

  describe('Mock mode behavior', () => {
    it('should mock email sending and log when api key env var is not present', async () => {
      (config as any).MAIL_API_KEY = '';
      (config as any).MAIL_API_SECRET = '';
      const devEmailService = new EmailService();

      const mockParams = {
        to: 'test@example.com',
        name: 'Test User',
        organizationName: 'Test Org',
        setupUrl: 'https://example.com/setup/token',
      };

      await devEmailService.sendPasswordSetupEmail(mockParams);

      expect(logger.debug).toHaveBeenCalledWith('--- MAILJET MOCK SEND ---');
      expect(logger.debug).toHaveBeenCalledWith('--- END MAILJET MOCK SEND ---');
      expect(mockRequest).not.toHaveBeenCalled();
    });
  });
});