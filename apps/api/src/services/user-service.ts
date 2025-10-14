import bcrypt from 'bcrypt';
import crypto from 'crypto';
import config from '@src/common/config';
import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from '@src/common/errors';
import { EmailService } from './email-service';
import {
  checkAccess,
  listRegisteredPolicies,
  registerPolicy,
} from '@src/common/policies';
import { PolicyService } from './policy-service';

registerPolicy('view-users');
registerPolicy('edit-users');
registerPolicy('add-users');

export interface UserContext {
  userId: number;
  email: string;
  organizationId: number;
  role: string;
  policies: string[];
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

export interface UserListData extends UserData {
  organizationName: string;
  organizationIdentifier: string | null;
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
  // TODO: remove connections from here and move to ConnectionService
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
  // TODO: remove connections from here and move to ConnectionService
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
  email: string;
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AddUserToOrganizationData {
  fullName: string;
  email: string;
  role: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyResetTokenResult {
  valid: boolean;
  message?: string;
  error?: string;
}

export class UserService {
  // TODO: Remove

  constructor(
    private db: Kysely<Database>,
    private emailService: EmailService,
    private policyService: PolicyService
  ) {}

  /**
   * Signup a user + organization
   */
  /**
   * Registers a new user and organization in the system.
   *
   * - Validates that the provided passwords match.
   * - Checks if the email is already in use.
   * - Hashes the user's password.
   * - Creates a new organization and user within a database transaction.
   * - Sends a welcome email to the new user.
   * - Returns the user's context information.
   *
   * @param data - The sign-up data containing user and organization details.
   * @returns A promise that resolves to the newly created user's context.
   * @throws {BadRequestError} If passwords do not match or email is already in use.
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

    // Create organization and user in a transaction
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
      policies: listRegisteredPolicies(),
    };
  }

  /**
   * Authenticates a user using their email and password.
   *
   * This method queries the database for a user with the provided email,
   * verifies the password using bcrypt, and returns the user's context if authentication succeeds.
   *
   * Throws an `UnauthorizedError` if the email or password is invalid.
   *
   * @param data - The login credentials containing email and password.
   * @returns A promise that resolves to the authenticated user's context.
   * @throws UnauthorizedError If the email or password is incorrect.
   */
  async login(data: LoginData): Promise<UserContext> {
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', data.email)
      .executeTakeFirst();
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    await this.policyService.cachePolicies(user.id);
    const policies = await this.policyService.getCachedPolicies(user.id);

    return {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      policies,
    };
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
  // TODO: remove connections from here and move to ConnectionService
  async getMyProfile(
    email: string,
    organizationId: number
  ): Promise<AccountData | null> {
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
        qb('connectedCompanyOneId', '=', organizationId).or(
          'connectedCompanyTwoId',
          '=',
          organizationId
        )
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
      policies: listRegisteredPolicies(),
      connectionRequests: {
        sent: sentConnectionRequests,
        received: receivedConnectionRequests,
      },
      connectedOrganizations,
    };
  }

  /**
   * Handles the password reset process for a user.
   *
   * This method accepts an email address, verifies its validity, and attempts to find the corresponding user.
   * Regardless of whether the user exists, it always returns a generic success message to prevent email enumeration attacks.
   * If the user exists, it generates a password reset token, stores it with a 15-minute expiration, and sends a password reset email.
   *
   * @param data - An object containing the user's email address.
   * @returns A promise that resolves to an object with a message indicating that a reset link has been sent if the email exists.
   * @throws {BadRequestError} If the email is missing or invalid.
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
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiration

    await this.db
      .insertInto('password_reset_tokens')
      .values({
        userId: user.id,
        token,
        expiresAt,
        createdAt: new Date(),
      })
      .execute();

    // Generate reset URL
    const resetUrl = `${config.FRONTEND_URL}/reset-password/${token}`;

    // Send password reset email
    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.fullName,
      resetUrl,
    });

    return {
      message:
        'If this email is known in our system, a reset link has been sent.',
    };
  }

  /**
   * Resets a user's password using a provided reset token.
   *
   * Validates the token, checks password requirements, and updates the user's password.
   * Marks the reset token as used after successful password reset.
   *
   * @param data - An object containing the reset token, new password, and password confirmation.
   * @returns An object with a success message.
   * @throws {BadRequestError} If any required field is missing, passwords do not match,
   *         password is too short, token is invalid, or token has expired.
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
    const foundToken = await this.db
      .selectFrom('password_reset_tokens')
      .selectAll()
      .where('token', '=', token)
      .where('usedAt', 'is', null)
      .executeTakeFirst();

    if (!foundToken) {
      throw new BadRequestError('Invalid reset token');
    }

    if (new Date() > foundToken.expiresAt) {
      throw new BadRequestError('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await this.db
      .updateTable('users')
      .set({ password: hashedPassword })
      .where('id', '=', foundToken.userId)
      .execute();

    // Mark token as used
    await this.db
      .updateTable('password_reset_tokens')
      .set({ usedAt: new Date() })
      .where('token', '=', token)
      .execute();

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Verify Reset Token - Check if reset token is valid
   */
  // TODO: Not necessary, the reset password endpoint already does this validation.
  // The client can just call the reset endpoint and see if it fails.
  async verifyResetToken(token: string): Promise<VerifyResetTokenResult> {
    if (!token || typeof token !== 'string') {
      throw new BadRequestError('Token is required');
    }

    const resetToken = await this.db
      .selectFrom('password_reset_tokens')
      .selectAll()
      .where('token', '=', token)
      .where('usedAt', 'is', null)
      .executeTakeFirst();

    if (!resetToken) {
      throw new BadRequestError('Invalid reset token');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestError('Reset token has expired');
    }

    return {
      valid: true,
      message: 'Token is valid',
    };
  }

  /**
   * Adds a new user to an existing organization.
   *
   * - Validates that the provided passwords match.
   * - Checks if the email is already in use.
   * - Verifies that the organization exists.
   * - Hashes the user's password.
   * - Creates the user within the specified organization.
   * - Sends a welcome email to the new user.
   * - Returns the user's context information.
   *
   * @param organizationId - The ID of the organization to add the user to.
   * @param data - The user data containing user details.
   * @returns A promise that resolves to the newly created user's context.
   * @throws {BadRequestError} If passwords do not match or email is already in use.
   * @throws {NotFoundError} If the organization doesn't exist.
   */
  async addUserToOrganization(
    context: UserContext,
    organizationId: number,
    data: AddUserToOrganizationData
  ): Promise<UserContext> {
    // Check if user has permission to add users to this organization
    checkAccess(
      context,
      'add-users',
      context.organizationId === organizationId || context.role === 'admin'
    );

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

    // Verify organization exists
    const organization = await this.db
      .selectFrom('organizations')
      .select(['id', 'name'])
      .where('id', '=', organizationId)
      .executeTakeFirst();

    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.db
      .insertInto('users')
      .values({
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        password: hashedPassword,
        organizationId: organizationId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Send welcome email
    await this.emailService.sendWelcomeEmail({
      to: user.email,
      name: user.fullName,
      companyName: organization.name,
    });

    // Return user context
    return {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      policies: listRegisteredPolicies(),
    };
  }
}
