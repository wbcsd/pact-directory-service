import { Kysely } from 'kysely';
import bcrypt from 'bcrypt';
import config from '@src/common/config';
import { Database } from '@src/database/types';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from '@src/common/errors';
import { generateCredentials } from '@src/util/credentials';
import {
  createPasswordResetToken,
  validateResetToken,
  markTokenAsUsed,
} from '@src/util/password-reset';
import { EmailService } from './email-service';


export interface UserContext {
  userId: number;
  email: string;
  organizationId: number;
  role: string;
}

export interface SignUpData {
  organizationName: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserData {
  id: number;
  fullName: string;
  email: string;
  role: string;
  organizationId: number;
  password: string;
}

export interface AccountData extends UserContext {
  fullName: string;
  organizationName: string;
  organizationIdentifier: string | null;
  solutionApiUrl: string | null;
  clientId: string | null;
  clientSecret: string | null;
  networkKey: string | null;
  organizationDescription: string | null;
  connectionRequests: {
    sent: {
      createdAt: Date;
      status: string;
      organizationName: string;
      organizationId: number;
    }[];
    received: {
      id: number;
      createdAt: Date;
      status: string;
      organizationName: string;
      organizationId: number;
    }[];
  };
  connectedOrganizations: {
    organizationId: number;
    organizationName: string;
    requestedAt: Date;
    createdAt: Date;
  }[];
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyResetTokenResult {
  valid: boolean;
  message?: string;
  error?: string;
}

export class UserService {

  constructor(
    private db: Kysely<Database>,
    private emailService: EmailService
  ) {}

  /**
   * Signup a user + company
   */
  async signup(data: SignUpData): Promise<UserContext> {
    // Check if passwords match
    if (data.password !== data.confirmPassword) {
      throw new BadRequestError('Passwords do not match');
    }

    // Check if email already exists
    const emailExists = await this.db
      .selectFrom('users')
      .where('email', '=', data.email)
      .executeTakeFirst();

    if (emailExists) {
      throw new BadRequestError('Email already in use.');
    }

    // TODO: create a random salt and store it next to the hashed password.
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // TODO: Move creation of client credentials to environments
    // const { clientId, clientSecret, networkKey } = await generateCredentials();
    await generateCredentials();

    const user = await this.db.transaction().execute(async (trx) => {
      const organization = await trx
        .insertInto('organizations')
        .values({
          name: data.organizationName,
          uri: '',
          solutionApiUrl: '',
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      return await trx
        .insertInto('users')
        .values({
          fullName: data.fullName,
          email: data.email,
          role: 'user', 
          password: hashedPassword,
          organizationId: organization.id,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });

    // Send welcome email
    await this.emailService.sendWelcomeEmail({
      to: user.email,
      name: user.fullName,
      companyName: data.organizationName,
    });

    // Return user profile
    return {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    };
  }

  /**
   * Login
   */
  async login(data: LoginData): Promise<UserContext> {
    const user = await this.db
      .selectFrom('users')
      .select(['password', 'id', 'email', 'organizationId', 'role'])
      .where('email', '=', data.email)
      .executeTakeFirst();
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,      
    }
  }

  async get(id: number): Promise<UserData> {
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
      
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Get user's profile including organization info, connection requests and connections
   */
  async getMyProfile(email: string, organizationId: number): Promise<AccountData | null> {
    const profile = await this.db
      .selectFrom('organizations as o')
      .innerJoin('users as u', 'o.id', 'u.organizationId')
      .select([
        'u.id as userId',
        'u.fullName',
        'u.email',
        'u.role',
        'o.id as organizationId',
        'o.name as organizationName',
        'o.uri as organizationIdentifier',
        'o.description as organizationDescription',
        'o.solutionApiUrl',
        'o.clientId',
        'o.clientSecret',
        'o.networkKey',
        'o.description',
      ])
      .where('u.email', '=', email)
      .executeTakeFirst();

    if (!profile) {
      throw new NotFoundError('User not found');
    }

    // Connection requests
    const sentConnectionRequests = await this.db
      .selectFrom('connection_requests')
      .innerJoin(
        'organizations',
        'connection_requests.requestedCompanyId',
        'organizations.id'
      )
      .select([
        'connection_requests.createdAt',
        'connection_requests.status',
        'organizations.name as organizationName',
        'requestedCompanyId as organizationId',
      ])
      .where('requestingCompanyId', '=', organizationId)
      .execute();

    const receivedConnectionRequests = await this.db
      .selectFrom('connection_requests')
      .innerJoin(
        'organizations',
        'connection_requests.requestingCompanyId',
        'organizations.id'
      )
      .select([
        'connection_requests.id',
        'connection_requests.createdAt',
        'connection_requests.status',
        'organizations.name as organizationName',
        'requestingCompanyId as organizationId',
      ])
      .where('requestedCompanyId', '=', organizationId)
      .execute();

    // connections
    const connections = await this.db
      .selectFrom('connections')
      .innerJoin(
        'organizations as companiesOne',
        'connections.connectedCompanyOneId',
        'companiesOne.id'
      )
      .innerJoin(
        'organizations as companiesTwo',
        'connections.connectedCompanyTwoId',
        'companiesTwo.id'
      )
      .select([
        'connections.connectedCompanyOneId',
        'connections.connectedCompanyTwoId',
        'connections.requestedAt',
        'connections.createdAt',
        'companiesOne.name as companyOneName',
        'companiesTwo.name as companyTwoName',
      ])
      .where((qb) =>
        qb('connectedCompanyOneId', '=', organizationId)
          .or('connectedCompanyTwoId', '=', organizationId)
      )
      .execute();

    const connectedOrganizations = connections.map((connection) => {
      if (connection.connectedCompanyOneId === organizationId) {
        return {
          organizationId: connection.connectedCompanyTwoId,
          organizationName: connection.companyTwoName,
          requestedAt: connection.requestedAt,
          createdAt: connection.createdAt,
        };
      }

      return {
        organizationId: connection.connectedCompanyOneId,
        organizationName: connection.companyOneName,
        requestedAt: connection.requestedAt,
        createdAt: connection.createdAt,
      };
    });

    return {
      ...profile,
      connectionRequests: {
        sent: sentConnectionRequests,
        received: receivedConnectionRequests,
      },
      connectedOrganizations,
    };
  }

  /**
   * Forgot Password - Request password reset
   */
  async forgotPassword(data: ForgotPasswordData): Promise<{ message: string }> {
    const { email } = data;

    if (!email || typeof email !== 'string') {
      throw new BadRequestError('Email is required');
    }

    // Find user by email
    const user = await this.db
      .selectFrom('users')
      .innerJoin('organizations', 'users.organizationId', 'organizations.id')
      .select(['users.id', 'users.fullName', 'users.email'])
      .where('users.email', '=', email.toLowerCase().trim())
      .executeTakeFirst();

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    // Create password reset token
    const token = await createPasswordResetToken(user.id);

    // Generate reset URL
    const resetUrl = `${config.FRONTEND_URL}/reset-password/${token}`;

    // Send password reset email
    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.fullName,
      resetUrl,
    });

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  /**
   * Reset Password - Reset password with token
   */
  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    const { token, password, confirmPassword } = data;

    if (
      !token ||
      typeof token !== 'string' ||
      !password ||
      typeof password !== 'string' ||
      !confirmPassword ||
      typeof confirmPassword !== 'string'
    ) {
      throw new BadRequestError(
        'Token, password, and confirm password are required'
      );
    }

    if (password !== confirmPassword) {
      throw new BadRequestError('Passwords do not match');
    }

    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long');
    }

    // Validate reset token
    const tokenValidation = await validateResetToken(token);

    if (!tokenValidation.isValid) {
      throw new BadRequestError(tokenValidation.error ?? 'Invalid token');
    }

    if (!tokenValidation.userId) {
      throw new BadRequestError('Invalid token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await this.db
      .updateTable('users')
      .set({ password: hashedPassword })
      .where('id', '=', tokenValidation.userId)
      .execute();

    // Mark token as used
    await markTokenAsUsed(token);

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Verify Reset Token - Check if reset token is valid
   */
  async verifyResetToken(token: string): Promise<VerifyResetTokenResult> {
    if (!token || typeof token !== 'string') {
      throw new BadRequestError('Token is required');
    }

    const tokenValidation = await validateResetToken(token);
    if (!tokenValidation.isValid) {
      throw new BadRequestError(tokenValidation.error ?? 'Invalid token');
    }

    return {
      valid: true,
      message: 'Token is valid',
    };
  }
}
