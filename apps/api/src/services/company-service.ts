import { Kysely } from 'kysely';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import config from '@src/common/config';
import { Database } from '@src/database/types';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '@src/common/errors';
import { generateCredentials } from '@src/util/credentials';
import { EmailService } from './email-service';
import {
  createPasswordResetToken,
  validateResetToken,
  markTokenAsUsed,
} from '@src/util/password-reset';

// Possible statuses for connection requests
const connectionRequestStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const;

export interface UserProfile {
  userId: number;
  email: string;
  companyId: number;
  role: string;
}

export interface SignUpInputData {
  companyName: string;
  companyIdentifier: string;
  companyIdentifierDescription: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  solutionApiUrl: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface MyProfileResult {
  id: number;
  companyName: string;
  companyIdentifier: string;
  solutionApiUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  networkKey: string | null;
  companyIdentifierDescription: string | null;
  fullName: string;
  email: string;
  role: string;
  connectionRequests: {
    sent: {
      createdAt: Date;
      status: string;
      companyName: string;
      companyId: number;
    }[];
    received: {
      id: number;
      createdAt: Date;
      status: string;
      companyName: string;
      companyId: number;
    }[];
  };
  connectedCompanies: {
    companyId: number;
    companyName: string;
    requestedAt: Date;
    createdAt: Date;
  }[];
}

export interface GetCompanyResult {
  company: {
    id: number;
    companyName: string;
    companyIdentifier: string;
    companyIdentifierDescription: string | null;
    networkKey: string | null;
    solutionApiUrl: string;
    fullName: string;
    email: string;
  };
  sentConnectionRequest?: {
    createdAt: Date;
    status: string;
  };
  receivedConnectionRequest?: {
    createdAt: Date;
    status: string;
  };
  connectedToCurrentCompany: boolean;
}

export interface SearchCompanyResult {
  id: number;
  companyName: string;
  companyIdentifier: string;
  solutionApiUrl: string;
  email: string;
  fullName: string;
}

export interface CreateConnectionRequestData {
  companyId: number;
}

export interface CreateConnectionRequestResult {
  id: number;
}

export interface ConnectionRequestActionData {
  requestId: number;
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

export class CompanyService {
  constructor(
    private db: Kysely<Database>,
    private emailService: EmailService
  ) {}

  /**
   *
   * Signup a user + company
   */
  async signup(data: SignUpInputData) {
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

    const { clientId, clientSecret, networkKey } = await generateCredentials();

    const user = await this.db.transaction().execute(async (trx) => {
      const organization = await trx
        .insertInto('organizations')
        .values({
          ...data,
          uri: data.companyIdentifier,
          name: data.companyName,
          clientId,
          clientSecret,
          networkKey,
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

    const userProfile: UserProfile = {
      userId: user.id,
      email: user.email,
      companyId: user.organizationId,
      role: user.role,
    };

    const token = jwt.sign(userProfile, config.JWT_SECRET, { expiresIn: '6h' });

    // Send welcome email
    await this.emailService.sendWelcomeEmail({
      to: data.email,
      name: data.fullName,
      companyName: data.companyName,
    });

    return token;
  }

  /**
   * Login
   */
  async login(data: LoginData) {
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

    const userProfile: UserProfile = {
      userId: user.id,
      email: user.email,
      companyId: user.organizationId,
      role: user.role,
    };

    const token = jwt.sign(userProfile, config.JWT_SECRET, { expiresIn: '6h' });

    return token;
  }

  /**
   * Get user's profile including company info, connection requests and connections
   */
  async getMyProfile(
    email: string,
    companyId: string
  ): Promise<MyProfileResult | null> {
    const profile = await this.db
      .selectFrom('organizations as o')
      .innerJoin('users as u', 'o.id', 'u.organizationId')
      .select([
        'o.id',
        'o.name as companyName',
        'o.uri as companyIdentifier',
        'o.description as companyIdentifierDescription',
        'o.solutionApiUrl',
        'o.clientId',
        'o.clientSecret',
        'o.networkKey',
        'o.description',
        'u.fullName',
        'u.email',
        'u.role',
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
        'organizations.name as companyName',
        'requestedCompanyId as companyId',
      ])
      .where('requestingCompanyId', '=', Number(companyId))
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
        'organizations.name as companyName',
        'requestingCompanyId as companyId',
      ])
      .where('requestedCompanyId', '=', Number(companyId))
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
        qb('connectedCompanyOneId', '=', Number(companyId)).or(
          'connectedCompanyTwoId',
          '=',
          Number(companyId)
        )
      )
      .execute();

    const connectedCompanies = connections.map((connection) => {
      if (connection.connectedCompanyOneId === Number(companyId)) {
        return {
          companyId: connection.connectedCompanyTwoId,
          companyName: connection.companyTwoName,
          requestedAt: connection.requestedAt,
          createdAt: connection.createdAt,
        };
      }

      return {
        companyId: connection.connectedCompanyOneId,
        companyName: connection.companyOneName,
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
      connectedCompanies,
    };
  }

  /**
   * Get a company by ID with connection status
   */
  async getCompany(
    companyId: string,
    currentUserCompanyId: string
  ): Promise<GetCompanyResult> {
    const company = await this.db
      .selectFrom('organizations as o')
      .innerJoin('users as u', 'o.id', 'u.organizationId')
      .select([
        'o.id',
        'o.name as companyName',
        'o.uri as companyIdentifier',
        'o.description as companyIdentifierDescription',
        'o.networkKey',
        'o.solutionApiUrl',
        'u.fullName',
        'u.email',
      ])
      .where('o.id', '=', Number(companyId))
      .executeTakeFirst();

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // This is the connection request sent by the current user on behalf of
    // their company
    const sentConnectionRequest = await this.db
      .selectFrom('connection_requests')
      .select(['createdAt', 'status'])
      .where('requestingCompanyId', '=', Number(currentUserCompanyId))
      .where('requestedCompanyId', '=', Number(companyId))
      .executeTakeFirst();

    // This is the connection request sent to the current user's company
    const receivedConnectionRequest = await this.db
      .selectFrom('connection_requests')
      .select(['createdAt', 'status'])
      .where('requestingCompanyId', '=', Number(companyId))
      .where('requestedCompanyId', '=', Number(currentUserCompanyId))
      .executeTakeFirst();

    // Are they connected?
    const connection = await this.db
      .selectFrom('connections')
      .where((qb) =>
        qb('connectedCompanyOneId', '=', Number(currentUserCompanyId)).or(
          'connectedCompanyTwoId',
          '=',
          Number(currentUserCompanyId)
        )
      )
      .where((qb) =>
        qb('connectedCompanyOneId', '=', Number(companyId)).or(
          'connectedCompanyTwoId',
          '=',
          Number(companyId)
        )
      )
      .executeTakeFirst();

    return {
      company,
      sentConnectionRequest: sentConnectionRequest ?? undefined,
      receivedConnectionRequest: receivedConnectionRequest ?? undefined,
      connectedToCurrentCompany: !!connection,
    };
  }

  /**
   * Search companies by companyName
   */
  async searchCompanies(
    searchQuery: string,
    currentUserCompanyId: string
  ): Promise<SearchCompanyResult[]> {
    if (!searchQuery) {
      throw new BadRequestError('searchQuery is required');
    }

    const companies = await this.db
      .selectFrom('organizations as o')
      .innerJoin('users as u', 'o.id', 'u.organizationId')
      .select([
        'o.id',
        'o.name as companyName',
        'o.uri as companyIdentifier',
        'o.solutionApiUrl',
        'u.email',
        'u.fullName',
      ])
      .where('o.name', 'ilike', `%${searchQuery}%`)
      .where('o.id', '!=', Number(currentUserCompanyId))
      .execute();

    return companies;
  }

  /**
   * Create a connection request
   */
  async createConnectionRequest(
    data: CreateConnectionRequestData,
    requestingCompanyId: number
  ): Promise<CreateConnectionRequestResult> {
    const { companyId: requestedCompanyId } = data;

    if (!requestedCompanyId) {
      throw new BadRequestError('Requested company ID is required');
    }

    if (requestingCompanyId === requestedCompanyId) {
      throw new BadRequestError('You cannot connect with yourself');
    }

    // TODO Validate connection request doesn't exist already

    const requestingCompany = await this.db
      .selectFrom('organizations')
      .selectAll()
      .where('id', '=', requestingCompanyId)
      .executeTakeFirst();

    const requestedCompany = await this.db
      .selectFrom('organizations as o')
      .leftJoin('users as u', 'o.id', 'u.organizationId')
      .select(['u.email', 'u.fullName'])
      .where('o.id', '=', requestedCompanyId)
      .executeTakeFirst();

    const result = await this.db
      .insertInto('connection_requests')
      .values({
        requestingCompanyId: requestingCompanyId,
        requestedCompanyId: requestedCompanyId,
        status: connectionRequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    // Send email to requested company
    if (
      requestedCompany &&
      requestingCompany &&
      requestedCompany.email &&
      requestedCompany.fullName
    ) {
      await this.emailService.sendConnectionRequestEmail({
        to: requestedCompany.email,
        name: requestedCompany.fullName,
        companyName: requestingCompany.name,
      });
    }

    return { id: result.id };
  }

  /**
   * Handle connection request action (accept connection request)
   */
  async acceptConnectionRequest(
    data: ConnectionRequestActionData,
    currentCompanyId: number
  ): Promise<{ message: string }> {
    const { requestId } = data;

    if (!requestId) {
      throw new BadRequestError('Request ID is required');
    }

    // TODO reject flow
    const connectionRequest = await this.db
      .selectFrom('connection_requests')
      .selectAll()
      .where('id', '=', requestId)
      .executeTakeFirst();

    if (!connectionRequest) {
      throw new NotFoundError('Connection request not found');
    }

    if (connectionRequest.requestedCompanyId !== currentCompanyId) {
      throw new ForbiddenError(
        'Only the requested company can accept the request'
      );
    }

    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('connections')
        .values({
          connectedCompanyOneId: connectionRequest.requestingCompanyId,
          connectedCompanyTwoId: connectionRequest.requestedCompanyId,
          createdAt: new Date(),
          requestedAt: connectionRequest.createdAt,
        })
        .execute();

      // TODO don't delete it, set it to accepted
      await trx
        .deleteFrom('connection_requests')
        .where('id', '=', requestId)
        .execute();
    });

    return { message: 'Connection created successfully' };
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

  async getOrganizationUsers(organizationId: string) {
    const users = await this.db
      .selectFrom('users')
      .select(['id', 'fullName', 'email', 'role', 'createdAt'])
      .where('organizationId', '=', Number(organizationId))
      .execute();

    return users;
  }
}
