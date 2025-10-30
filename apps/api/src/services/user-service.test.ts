import { UserService } from './user-service';
import { EmailService } from './email-service';
import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import config from '@src/common/config';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from '@src/common/errors';
import { Role } from '@src/common/policies';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('crypto');
jest.mock('@src/common/config');
jest.mock('./email-service');

describe('UserService', () => {
  let userService: UserService;
  let mockDb: jest.Mocked<Kysely<Database>>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock database
    mockDb = {
      selectFrom: jest.fn(),
      insertInto: jest.fn(),
      updateTable: jest.fn(),
      transaction: jest.fn(),
    } as any;

    // Mock email service
    mockEmailService = {
      sendEmailVerification: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendPasswordSetupEmail: jest.fn(),
    } as any;

    // Mock config
    (config as any).FRONTEND_URL = 'http://localhost:3000';
    (config as any).EMAIL_VERIFICATION_EXP = 21600; // 6 hours in seconds

    // @ts-expect-error
    userService = new UserService(mockDb, mockEmailService);
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

      // Mock email check
      mockDb.selectFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: jest.fn().mockResolvedValue(null),
        }),
      });

      // Mock transaction
      mockDb.transaction = jest.fn().mockReturnValue({
        execute: jest.fn().mockImplementation(async (callback) => {
          const mockTrx = {
            insertInto: jest.fn().mockReturnValue({
              values: jest.fn().mockReturnValue({
                returning: jest.fn().mockReturnValue({
                  executeTakeFirstOrThrow: jest
                    .fn()
                    .mockResolvedValue({ id: mockOrgId }),
                }),
              }),
            }),
          };

          // Second insertInto call for user
          mockTrx.insertInto = jest
            .fn()
            .mockReturnValueOnce({
              values: jest.fn().mockReturnValue({
                returning: jest.fn().mockReturnValue({
                  executeTakeFirstOrThrow: jest
                    .fn()
                    .mockResolvedValue({ id: mockOrgId }),
                }),
              }),
            })
            .mockReturnValueOnce({
              values: jest.fn().mockReturnValue({
                returningAll: jest.fn().mockReturnValue({
                  executeTakeFirstOrThrow: jest.fn().mockResolvedValue({
                    id: mockUserId,
                    email: 'john@example.com',
                    fullName: 'John Doe',
                    organizationId: mockOrgId,
                  }),
                }),
              }),
            });

          return callback(mockTrx);
        }),
      });

      // Mock updateTable for verification token
      mockDb.updateTable = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(undefined),
          }),
        }),
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
      mockDb.selectFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: jest
            .fn()
            .mockResolvedValue({ email: 'john@example.com' }),
        }),
      });

      await expect(userService.signup(signupData)).rejects.toThrow(
        BadRequestError
      );
      await expect(userService.signup(signupData)).rejects.toThrow(
        'Email already in use'
      );
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
      });
      mockDb.selectFrom = mockSelectFrom;

      mockDb.transaction = jest.fn().mockReturnValue({
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

      mockDb.updateTable = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      await userService.signup(dataWithUppercaseEmail);

      expect(mockSelectFrom).toHaveBeenCalledWith('users');
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

      mockDb.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            executeTakeFirst: jest.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await userService.login(loginData);

      expect(result.userId).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.organizationId).toBe(mockUser.organizationId);
      expect(result.role).toBe(mockUser.role);
      expect(result.status).toBe('enabled');
    });

    it('should throw UnauthorizedError if user does not exist', async () => {
      mockDb.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            executeTakeFirst: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(userService.login(loginData)).rejects.toThrow(
        UnauthorizedError
      );
      await expect(userService.login(loginData)).rejects.toThrow(
        'Invalid email or password'
      );
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

      mockDb.selectFrom = jest.fn().mockReturnValue({
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

      mockDb.selectFrom = jest.fn().mockReturnValue({
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

      mockDb.selectFrom = jest.fn().mockReturnValue({
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

      mockDb.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              executeTakeFirst: jest.fn().mockResolvedValue(mockUser),
            }),
          }),
        }),
      });

      mockDb.updateTable = jest.fn().mockReturnValue({
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
      mockDb.selectFrom = jest.fn().mockReturnValue({
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

      mockDb.selectFrom = jest.fn().mockReturnValue({
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

      mockDb.selectFrom = jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              executeTakeFirst: jest.fn().mockResolvedValue(mockUser),
            }),
          }),
        }),
      });

      mockDb.insertInto = jest.fn().mockReturnValue({
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
      mockDb.selectFrom = jest.fn().mockReturnValue({
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

      mockDb.selectFrom = jest.fn().mockReturnValue({
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

      mockDb.updateTable = jest.fn().mockReturnValue({
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
      mockDb.selectFrom = jest.fn().mockReturnValue({
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

      mockDb.selectFrom = jest.fn().mockReturnValue({
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

      mockDb.selectFrom = jest.fn().mockReturnValue({
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

      mockDb.transaction = jest.fn().mockReturnValue({
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

      mockDb.selectFrom = jest.fn().mockReturnValue({
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
      policies: ['add-users'],
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

      mockDb.selectFrom = jest
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

      mockDb.insertInto = jest
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
      mockDb.selectFrom = jest.fn().mockReturnValue({
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
      mockDb.selectFrom = jest
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
  });
});