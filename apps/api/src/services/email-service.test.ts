import { EmailService } from './email-service';
import config from '@src/common/config';
import logger from '@src/common/logger';
import sgMail from '@sendgrid/mail';

// Mock dependencies
jest.mock('@sendgrid/mail');
jest.mock('@src/common/config');
jest.mock('@src/common/logger');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockSgMailSend: jest.Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock implementations
    mockSgMailSend = jest.fn().mockResolvedValue([{}, {}]);
    (sgMail.send as jest.Mock) = mockSgMailSend;
    (sgMail.setApiKey as jest.Mock) = jest.fn();

    // Mock config values
    (config as any).SENDGRID_API_KEY = 'test-api-key';
    (config as any).SENDGRID_FROM_EMAIL = 'noreply@test.com';
    (config as any).NODE_ENV = 'test';

    // Mock logger methods
    (logger.debug as jest.Mock) = jest.fn();
    (logger.info as jest.Mock) = jest.fn();
    (logger.error as jest.Mock) = jest.fn();

    emailService = new EmailService();
  });

  describe('constructor', () => {
    it('should mock email sending in development mode', () => {
      (config as any).NODE_ENV = 'development';
      const devEmailService = new EmailService();
      
      expect(typeof sgMail.send).toBe('function');
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

      expect(mockSgMailSend).toHaveBeenCalledTimes(1);
      
      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.to).toBe(mockParams.to);
      expect(sentMessage.from).toBe('noreply@test.com');
      expect(sentMessage.subject).toBe(`Set your password for ${mockParams.organizationName}`);
    });

    it('should include user name in email content', async () => {
      await emailService.sendPasswordSetupEmail(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.html).toContain(mockParams.name);
    });

    it('should include organization name in email content', async () => {
      await emailService.sendPasswordSetupEmail(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.html).toContain(mockParams.organizationName);
    });

    it('should include setup URL in email content', async () => {
      await emailService.sendPasswordSetupEmail(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.html).toContain(mockParams.setupUrl);
    });

    it('should mention 72 hour expiration in email content', async () => {
      await emailService.sendPasswordSetupEmail(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.html).toContain('72 hours');
    });

    it('should handle SendGrid errors', async () => {
      const error = new Error('SendGrid error');
      mockSgMailSend.mockRejectedValueOnce(error);

      await expect(emailService.sendPasswordSetupEmail(mockParams)).rejects.toThrow('SendGrid error');
    });
  });

  describe('sendEmailVerification', () => {
    const mockParams = {
      to: 'user@example.com',
      name: 'Jane Smith',
      organizationName: 'Test Company',
      verificationUrl: 'https://example.com/verify/token456',
    };

    it('should send email verification with correct parameters', async () => {
      await emailService.sendEmailVerification(mockParams);

      expect(mockSgMailSend).toHaveBeenCalledTimes(1);
      
      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.to).toBe(mockParams.to);
      expect(sentMessage.from).toBe('noreply@test.com');
      expect(sentMessage.subject).toBe(`Please verify your email address for ${mockParams.organizationName}`);
    });

    it('should include user name in email content', async () => {
      await emailService.sendEmailVerification(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.html).toContain(mockParams.name);
    });

    it('should include verification URL in email content', async () => {
      await emailService.sendEmailVerification(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.html).toContain(mockParams.verificationUrl);
    });

    it('should mention 24 hour expiration in email content', async () => {
      await emailService.sendEmailVerification(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.html).toContain('24 hours');
    });

    it('should handle SendGrid errors', async () => {
      const error = new Error('SendGrid error');
      mockSgMailSend.mockRejectedValueOnce(error);

      await expect(emailService.sendEmailVerification(mockParams)).rejects.toThrow('SendGrid error');
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

      expect(mockSgMailSend).toHaveBeenCalledTimes(1);
      
      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.to).toBe(mockParams.to);
      expect(sentMessage.from).toBe('noreply@test.com');
      expect(sentMessage.subject).toBe('Connection Request from PACT Network');
    });

    it('should include user name in email content', async () => {
      await emailService.sendConnectionRequestEmail(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.text).toContain(mockParams.name);
      expect(sentMessage.html).toContain(mockParams.name);
    });

    it('should include organization name in email content', async () => {
      await emailService.sendConnectionRequestEmail(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.text).toContain(mockParams.organizationName);
      expect(sentMessage.html).toContain(mockParams.organizationName);
    });

    it('should include management link in HTML content', async () => {
      await emailService.sendConnectionRequestEmail(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.html).toContain('https://pact-directory-portal.onrender.com/manage-connections');
    });

    it('should log success message after sending', async () => {
      await emailService.sendConnectionRequestEmail(mockParams);

      expect(logger.info).toHaveBeenCalledWith(`Email sent to ${mockParams.name}`);
    });

    it('should catch and log SendGrid errors without throwing', async () => {
      const error = new Error('SendGrid error');
      mockSgMailSend.mockRejectedValueOnce(error);

      await emailService.sendConnectionRequestEmail(mockParams);

      expect(logger.error).toHaveBeenCalledWith('sendConnectionRequestEmail error', error);
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

      expect(mockSgMailSend).toHaveBeenCalledTimes(1);
      
      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.to).toBe(mockParams.to);
      expect(sentMessage.from).toBe('noreply@test.com');
      expect(sentMessage.subject).toBe('Password Reset Request - PACT Network');
    });

    it('should include both text and HTML content', async () => {
      await emailService.sendPasswordResetEmail(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.text).toBeDefined();
      expect(sentMessage.html).toBeDefined();
    });

    it('should include user name in email content', async () => {
      await emailService.sendPasswordResetEmail(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.text).toContain(mockParams.name);
      expect(sentMessage.html).toContain(mockParams.name);
    });

    it('should include reset URL in email content', async () => {
      await emailService.sendPasswordResetEmail(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.text).toContain(mockParams.resetUrl);
      expect(sentMessage.html).toContain(mockParams.resetUrl);
    });

    it('should mention 15 minute expiration in email content', async () => {
      await emailService.sendPasswordResetEmail(mockParams);

      const sentMessage = mockSgMailSend.mock.calls[0][0];
      expect(sentMessage.text).toContain('15 minutes');
      expect(sentMessage.html).toContain('15 minutes');
    });

    it('should log success message after sending', async () => {
      await emailService.sendPasswordResetEmail(mockParams);

      expect(logger.info).toHaveBeenCalledWith(`Password reset email sent to ${mockParams.to}`);
    });

    it('should catch and log SendGrid errors without throwing', async () => {
      const error = new Error('SendGrid error');
      mockSgMailSend.mockRejectedValueOnce(error);

      await emailService.sendPasswordResetEmail(mockParams);

      expect(logger.error).toHaveBeenCalledWith('sendPasswordResetEmail error', error);
    });
  });

  describe('Development mode behavior', () => {
    it('should mock email sending and log in development mode', async () => {
      (config as any).NODE_ENV = 'development';
      const devEmailService = new EmailService();

      const mockParams = {
        to: 'test@example.com',
        name: 'Test User',
        organizationName: 'Test Org',
        setupUrl: 'https://example.com/setup/token',
      };

      await devEmailService.sendPasswordSetupEmail(mockParams);

      // In development mode, the mock should log the message
      expect(logger.debug).toHaveBeenCalledWith('--- SENDGRID MOCK SEND ---');
      expect(logger.debug).toHaveBeenCalledWith('--- END SENDGRID MOCK SEND ---');
    });
  });
});