import { UserService } from './user-service';
import { EmailService } from './email-service';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import config from '@src/common/config';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from '@src/common/errors';
import { Role } from '@src/common/policies';
import { createMockDatabase } from '../common/mock-utils';
import logger from '@src/common/logger';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('crypto');
jest.mock('@src/common/config');
jest.mock('./email-service');

describe('UserService', () => {
  let userService: UserService;
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create standardized database mocks
    dbMocks = createMockDatabase();

    // Mock email service
    mockEmailService = {
      sendEmailVerification: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendPasswordSetupEmail: jest.fn(),
    } as any;

    // Mock config
    (config as any).FRONTEND_URL = 'http://localhost:3000';
    (config as any).EMAIL_VERIFICATION_EXP = 21600; // 6 hours in seconds

    userService = new UserService(dbMocks.db as any, mockEmailService);
  });

  describe('signup', () => {
    const signupData = {
      organizationName: 'Test Org',
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    it('should successfully sign up a new user', async () => {
      const hashedPassword = 'hashedPassword123';
      const mockOrgId = 1;
      const mockUserId = 1;

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue('mocktoken123'),
      });

      // Mock email check - user doesn't exist
      dbMocks.executors.executeTakeFirst.mockResolvedValue(null);

      // Mock transaction execution
      dbMocks.transaction().execute.mockImplementation(async (callback: any) => {
        const mockTrx = {
          insertInto: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockReturnValue({
                executeTakeFirstOrThrow: jest.fn().mockResolvedValue({ id: mockOrgId }),
              }),
              returningAll: jest.fn().mockReturnValue({
                executeTakeFirstOrThrow: jest.fn().mockResolvedValue({
                  id: mockUserId,
                  email: 'john@example.com',
                  fullName: 'John Doe',
                  organizationId: mockOrgId,
                }),
              }),
            }),
          }),
        };
        return callback(mockTrx);
      });

      const result = await userService.signup(signupData);

      expect(result.message).toContain('Registration successful');
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalled();
    });

    it('should throw BadRequestError if passwords do not match', async () => {
      const invalidData = {
        ...signupData,
        confirmPassword: 'differentPassword',
      };

      await expect(userService.signup(invalidData)).rejects.toThrow(
        BadRequestError
      );
      await expect(userService.signup(invalidData)).rejects.toThrow(
        'Passwords do not match'
      );
    });

    it('should throw BadRequestError if email already exists', async () => {
      // Mock that email already exists
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ email: 'john@example.com' });

      await expect(userService.signup(signupData)).rejects.toThrow(BadRequestError);
      await expect(userService.signup(signupData)).rejects.toThrow('Email already in use');
    });

    it('should normalize email to lowercase and trim', async () => {
      const dataWithUppercaseEmail = {
        ...signupData,
        email: '  JOHN@EXAMPLE.COM  ',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue('mocktoken'),
      });

      const mockSelectFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: jest.fn().mockResolvedValue(null),
        }),
        select: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            executeTakeFirst: jest.fn().mockResolvedValue(null),
          }),
        }),
      });
      dbMocks.db.selectFrom = mockSelectFrom;

      dbMocks.db.transaction = jest.fn().mockReturnValue({
        execute: jest.fn().mockImplementation(async (callback) => {
          const mockTrx = {
            insertInto: jest
              .fn()
              .mockReturnValueOnce({
                values: jest.fn().mockReturnValue({
                  returning: jest.fn().mockReturnValue({
                    executeTakeFirstOrThrow: jest
                      .fn()
                      .mockResolvedValue({ id: 1 }),
                  }),
                }),
              })
              .mockReturnValueOnce({
                values: jest.fn().mockReturnValue({
                  returningAll: jest.fn().mockReturnValue({
                    executeTakeFirstOrThrow: jest.fn().mockResolvedValue({
                      id: 1,
                      email: 'john@example.com',
                      fullName: 'John Doe',
                      organizationId: 1,
                    }),
                  }),
                }),
              }),
          };
          return callback(mockTrx);
        }),
      });

      dbMocks.db.updateTable = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      await userService.signup(dataWithUppercaseEmail);

      expect(mockSelectFrom).toHaveBeenCalledWith('users');
    });

    it('should throw BadRequestError if organization name is already taken', async () => {
      // Mock email check - user doesn't exist
      dbMocks.executors.executeTakeFirst
        .mockResolvedValueOnce(null) // For email check
        .mockResolvedValueOnce({ id: 1 }); // For organization name check

      await expect(userService.signup(signupData)).rejects.toThrow(
        'Organization name is already in use'
      );
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'john@example.com',
      password: 'password123',
    };

    it('should successfully log in a user with valid credentials', async () => {
      const mockUser = {
        id: 1,
        email: 'john@example.com',
        password: 'hashedPassword',
        role: Role.User,
        organizationId: 1,
        status: 'enabled' as const,
      };

      // Mock user exists and password matches
      dbMocks.executors.executeTakeFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await userService.login(loginData);

      expect(result.userId).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.organizationId).toBe(mockUser.organizationId);
      expect(result.role).toBe(mockUser.role);
      expect(result.status).toBe('enabled');
    });

    it('should throw UnauthorizedError if user does not exist', async () => {
      // Mock user not found
      dbMocks.executors.executeTakeFirst.mockResolvedValue(null);

      await expect(userService.login(loginData)).rejects.toThrow(UnauthorizedError);
      await expect(userService.login(loginData)).rejects.toThrow('Invalid email or password');
    });

    it('should throw UnauthorizedError if password is invalid', async () => {
      const mockUser = {
        id: 1,
        email: 'john@example.com',
        password: 'hashedPassword',
        role: Role.User,
        organizationId: 1,
        status: 'enabled' as const,
      };

      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            executeTakeFirst: jest.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(userService.login(loginData)).rejects.toThrow(
        UnauthorizedError
      );
      await expect(userService.login(loginData)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw UnauthorizedError if user is deleted', async () => {
      const mockUser = {
        id: 1,
        email: 'john@example.com',
        password: 'hashedPassword',
        role: Role.User,
        organizationId: 1,
        status: 'deleted' as const,
      };

      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            executeTakeFirst: jest.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      await expect(userService.login(loginData)).rejects.toThrow(
        UnauthorizedError
      );
      await expect(userService.login(loginData)).rejects.toThrow(
        'Account not found'
      );
    });

    it('should throw UnauthorizedError if user is disabled', async () => {
      const mockUser = {
        id: 1,
        email: 'john@example.com',
        password: 'hashedPassword',
        role: Role.User,
        organizationId: 1,
        status: 'disabled' as const,
      };

      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            executeTakeFirst: jest.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      await expect(userService.login(loginData)).rejects.toThrow(
        UnauthorizedError
      );
      await expect(userService.login(loginData)).rejects.toThrow(
        'Account has been disabled'
      );
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const token = 'validToken123';
      const mockUser = {
        id: 1,
        emailVerificationToken: token,
        status: 'unverified' as const,
        emailVerificationSentAt: new Date(),
      };

      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              executeTakeFirst: jest.fn().mockResolvedValue(mockUser),
            }),
          }),
        }),
      });

      dbMocks.db.updateTable = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const result = await userService.verifyEmail({ token });

      expect(result.message).toContain('Email verified successfully');
    });

    it('should throw BadRequestError if token is missing', async () => {
      await expect(
        userService.verifyEmail({ token: '' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if token is invalid', async () => {
      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              executeTakeFirst: jest.fn().mockResolvedValue(null),
            }),
          }),
        }),
      });

      await expect(
        userService.verifyEmail({ token: 'invalidToken' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if token is expired', async () => {
      const token = 'expiredToken';
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 24);

      const mockUser = {
        id: 1,
        emailVerificationToken: token,
        status: 'unverified' as const,
        emailVerificationSentAt: expiredDate,
      };

      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              executeTakeFirst: jest.fn().mockResolvedValue(mockUser),
            }),
          }),
        }),
      });

      await expect(
        userService.verifyEmail({ token })
      ).rejects.toThrow(BadRequestError);
      await expect(
        userService.verifyEmail({ token })
      ).rejects.toThrow('Verification token has expired');
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      const mockUser = {
        id: 1,
        fullName: 'John Doe',
        email: 'john@example.com',
      };

      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue('resetToken123'),
      });

      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              executeTakeFirst: jest.fn().mockResolvedValue(mockUser),
            }),
          }),
        }),
      });

      dbMocks.db.insertInto = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          execute: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await userService.forgotPassword({
        email: 'john@example.com',
      });

      expect(result.message).toContain('reset link has been sent');
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return generic message for non-existing user', async () => {
      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              executeTakeFirst: jest.fn().mockResolvedValue(null),
            }),
          }),
        }),
      });

      const result = await userService.forgotPassword({
        email: 'nonexistent@example.com',
      });

      expect(result.message).toContain('reset link has been sent');
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if email is missing', async () => {
      await expect(
        userService.forgotPassword({ email: '' })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('resetPassword', () => {
    const resetData = {
      email: 'john@example.com',
      token: 'validToken123',
      password: 'newPassword123',
      confirmPassword: 'newPassword123',
    };

    it('should successfully reset password with valid token', async () => {
      const mockToken = {
        userId: 1,
        token: 'validToken123',
        type: 'reset' as const,
        expiresAt: new Date(Date.now() + 10000),
        usedAt: null,
      };

      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                executeTakeFirst: jest.fn().mockResolvedValue(mockToken),
              }),
            }),
          }),
        }),
      });

      dbMocks.db.updateTable = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      const result = await userService.resetPassword(resetData);

      expect(result.message).toContain('Password has been reset successfully');
    });

    it('should throw BadRequestError if passwords do not match', async () => {
      const invalidData = {
        ...resetData,
        confirmPassword: 'differentPassword',
      };

      await expect(userService.resetPassword(invalidData)).rejects.toThrow(
        BadRequestError
      );
      await expect(userService.resetPassword(invalidData)).rejects.toThrow(
        'Passwords do not match'
      );
    });

    it('should throw BadRequestError if password is too short', async () => {
      const invalidData = {
        ...resetData,
        password: '12345',
        confirmPassword: '12345',
      };

      await expect(userService.resetPassword(invalidData)).rejects.toThrow(
        BadRequestError
      );
      await expect(userService.resetPassword(invalidData)).rejects.toThrow(
        'Password must be at least 6 characters'
      );
    });

    it('should throw BadRequestError if token is invalid', async () => {
      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                executeTakeFirst: jest.fn().mockResolvedValue(null),
              }),
            }),
          }),
        }),
      });

      await expect(userService.resetPassword(resetData)).rejects.toThrow(
        BadRequestError
      );
      await expect(userService.resetPassword(resetData)).rejects.toThrow(
        'Invalid reset token'
      );
    });

    it('should throw BadRequestError if token is expired', async () => {
      const mockToken = {
        userId: 1,
        token: 'expiredToken',
        type: 'reset' as const,
        expiresAt: new Date(Date.now() - 10000),
        usedAt: null,
      };

      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                executeTakeFirst: jest.fn().mockResolvedValue(mockToken),
              }),
            }),
          }),
        }),
      });

      await expect(userService.resetPassword(resetData)).rejects.toThrow(
        BadRequestError
      );
      await expect(userService.resetPassword(resetData)).rejects.toThrow(
        'Reset token has expired'
      );
    });
  });

  describe('setPasswordWithToken', () => {
    const setPasswordData = {
      token: 'setupToken123',
      password: 'newPassword123',
      confirmPassword: 'newPassword123',
    };

    it('should successfully set password with valid setup token', async () => {
      const mockToken = {
        userId: 1,
        usedAt: null,
        expiresAt: new Date(Date.now() + 10000),
        email: 'john@example.com',
      };

      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                executeTakeFirst: jest.fn().mockResolvedValue(mockToken),
              }),
            }),
          }),
        }),
      });

      dbMocks.db.transaction = jest.fn().mockReturnValue({
        execute: jest.fn().mockImplementation(async (callback) => {
          const mockTrx = {
            updateTable: jest.fn().mockReturnValue({
              set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                  execute: jest.fn().mockResolvedValue(undefined),
                }),
              }),
            }),
          };
          return callback(mockTrx);
        }),
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await userService.setPasswordWithToken(setPasswordData);

      expect(result.message).toContain('Password has been set successfully');
    });

    it('should throw BadRequestError if passwords do not match', async () => {
      const invalidData = {
        ...setPasswordData,
        confirmPassword: 'differentPassword',
      };

      await expect(
        userService.setPasswordWithToken(invalidData)
      ).rejects.toThrow(BadRequestError);
      await expect(
        userService.setPasswordWithToken(invalidData)
      ).rejects.toThrow('Passwords do not match');
    });

    it('should throw BadRequestError if token is already used', async () => {
      const mockToken = {
        userId: 1,
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
        email: 'john@example.com',
      };

      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                executeTakeFirst: jest.fn().mockResolvedValue(mockToken),
              }),
            }),
          }),
        }),
      });

      await expect(
        userService.setPasswordWithToken(setPasswordData)
      ).rejects.toThrow(BadRequestError);
      await expect(
        userService.setPasswordWithToken(setPasswordData)
      ).rejects.toThrow('This setup link has already been used');
    });
  });

  describe('addUserToOrganization', () => {
    const context = {
      userId: 1,
      email: 'admin@example.com',
      organizationId: 1,
      role: Role.Administrator,
      policies: ['edit-users'],
      status: 'enabled' as const,
    };

    const userData = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      role: Role.User,
    };

    it('should successfully add user to organization', async () => {
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue('setupToken123'),
      });

      dbMocks.db.selectFrom = jest
        .fn()
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            executeTakeFirst: jest.fn().mockResolvedValue(null),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              executeTakeFirst: jest
                .fn()
                .mockResolvedValue({ id: 1, name: 'Test Org' }),
            }),
          }),
        });

      dbMocks.db.insertInto = jest
        .fn()
        .mockReturnValueOnce({
          values: jest.fn().mockReturnValue({
            returningAll: jest.fn().mockReturnValue({
              executeTakeFirstOrThrow: jest.fn().mockResolvedValue({
                id: 2,
                email: 'jane@example.com',
                fullName: 'Jane Doe',
                organizationId: 1,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          values: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(undefined),
          }),
        });

      (bcrypt.hash as jest.Mock).mockResolvedValue('placeholderHash');

      const result = await userService.addUserToOrganization(
        context,
        1,
        userData
      );

      expect(result.message).toContain('User created successfully');
      expect(result.userId).toBe(2);
      expect(mockEmailService.sendPasswordSetupEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestError if email already exists', async () => {
      dbMocks.db.selectFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: jest
            .fn()
            .mockResolvedValue({ email: 'jane@example.com' }),
        }),
      });

      await expect(
        userService.addUserToOrganization(context, 1, userData)
      ).rejects.toThrow(BadRequestError);
      await expect(
        userService.addUserToOrganization(context, 1, userData)
      ).rejects.toThrow('Email already in use');
    });

    it('should throw NotFoundError if organization does not exist', async () => {
      dbMocks.db.selectFrom = jest
        .fn()
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            executeTakeFirst: jest.fn().mockResolvedValue(null),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              executeTakeFirst: jest.fn().mockResolvedValue(null),
            }),
          }),
        });

      await expect(
        userService.addUserToOrganization(context, 999, userData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should update lastLogin when succesfully logging in', async () => {
      const mockUser = {
        id: 1,
        email: 'mock@user.com',
        password: 'hashedPassword',
        role: Role.User,
        organizationId: 1,
        status: 'enabled' as const,
      };

      // Mock user exists and password matches
      dbMocks.executors.executeTakeFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await userService.login({
        email: 'mock@user.com',
        password: 'anyPassword',
      });

      expect(result.userId).toBe(mockUser.id);
      expect(dbMocks.db.updateTable).toHaveBeenCalledWith('users');
    });

    it('should log error if updating lastLogin fails', async () => {
      const mockUser = {
        id: 1,
        email: 'mock@user.com',
        password: 'hashedPassword',
        role: Role.User,
        organizationId: 1,
        status: 'enabled' as const,
      };

      // Mock user exists and password matches
      dbMocks.executors.executeTakeFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Mock updateTable to throw error
      dbMocks.db.updateTable = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      });

      const loggerErrorSpy = jest
        .spyOn(logger, 'error')
        .mockImplementation(() => {});

      const result = await userService.login({
        email: 'mock@user.com',
        password: 'anyPassword',
      });

      expect(result.userId).toBe(mockUser.id);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to update lastLogin for user:',
        mockUser.id,
        expect.any(Error)
      );

      loggerErrorSpy.mockRestore();
    });
  });
});