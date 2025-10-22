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
  getPoliciesForRole,
  registerPolicy,
  Role,
} from '@src/common/policies';

registerPolicy([Role.Administrator, Role.Root], 'view-users');
registerPolicy([Role.Administrator, Role.Root], 'edit-users');
registerPolicy([Role.Administrator, Role.Root], 'add-users');
registerPolicy([Role.Root], 'view-all-users');
registerPolicy([Role.Root], 'edit-all-users');
registerPolicy([Role.Root], 'add-all-users');

export interface UserContext {
  userId: number;
  email: string;
  organizationId: number;
  role: Role;
  policies: string[];
  status: 'unverified' | 'enabled' | 'disabled' | 'deleted';
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
  role: Role;
  organizationId: number;
  status: string 
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
  role: Role;
  password: string;
  confirmPassword: string;
}

export interface VerifyResetTokenResult {
  valid: boolean;
  message?: string;
  error?: string;
}

export interface EmailVerificationData {
  token: string;
}

export interface ResendVerificationData {
  email: string;
}

export class UserService {
  // TODO: Remove

  constructor(
    private db: Kysely<Database>,
    private emailService: EmailService
  ) {}

  /**
   * Helper function to check if email verification token has expired
   */
  private isVerificationTokenExpired(sentAt: Date | null): boolean {
    if (!sentAt) return true;
    const expirationTime = new Date(sentAt.getTime() + (config.EMAIL_VERIFICATION_EXP * 1000));
    return new Date() > expirationTime;
  }

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
   * - Sends an email to the new user to verify their email address.
   * - Returns the user's context information.
   *
   * @param data - The sign-up data containing user and organization details.
   * @returns A promise that resolves to the newly created user's context.
   * @throws {BadRequestError} If passwords do not match or email is already in use.
   */
  async signup(data: SignUpData): Promise<{ message: string; }> {
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
          role: Role.User,
          password: hashedPassword,
          organizationId: organization.id,
          status: 'unverified', // Set as unverified initially
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });

    // Generate and send verification token
    await this.generateAndSendVerificationToken(
      user.id,
      user.email,
      user.fullName,
      data.organizationName
    );

    return {
      message: 'Registration successful. Please check your email to verify your account.',
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

    // Check if user is deleted
    if (user.status === 'deleted') {
      throw new UnauthorizedError('Account not found');
    }

    // Check if user is disabled
    if (user.status === 'disabled') {
      throw new UnauthorizedError('Account has been disabled. Please contact support.');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const policies = getPoliciesForRole(user.role);

    return {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      policies,
    };
  }

    /**
   * Get user by ID
   */
  async get(context: UserContext, id: number): Promise<UserData> {
    checkAccess(context, [], context.userId === id || context.role === Role.Administrator);
    
    const user = await this.db
      .selectFrom('users')
      .innerJoin('organizations', 'users.organizationId', 'organizations.id')
      .select([
        'users.id as id',
        'users.fullName as fullName',
        'users.email as email',
        'users.role as role',
        'users.status as status',
        'organizations.name as organizationName',
        'organizations.id as organizationId',
        'organizations.uri as organizationIdentifier',
      ])
      .where('users.id', '=', id)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Verify email address using verification token
   */
  async verifyEmail(data: EmailVerificationData): Promise<{ message: string }> {
    const { token } = data;

    if (!token || typeof token !== 'string') {
      throw new BadRequestError('Verification token is required');
    }

    // Find user by verification token
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('emailVerificationToken', '=', token)
      .where('status', '=', 'unverified')
      .executeTakeFirst();

    if (!user) {
      throw new BadRequestError('Invalid or already used verification token');
    }

    // Check if token has expired
    if (this.isVerificationTokenExpired(user.emailVerificationSentAt)) {
      throw new BadRequestError('Verification token has expired');
    }

    // Update user status
    await this.db
      .updateTable('users')
      .set({
        status: 'enabled',
        emailVerificationToken: null,
      })
      .where('id', '=', user.id)
      .execute();

    return { message: 'Email verified successfully. Your account is now active.' };
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(data: ResendVerificationData): Promise<{ message: string }> {
    const { email } = data;

    if (!email || typeof email !== 'string') {
      throw new BadRequestError('Email is required');
    }

    // Find user by email
    const user = await this.db
      .selectFrom('users')
      .innerJoin('organizations', 'users.organizationId', 'organizations.id')
      .select([
        'users.id',
        'users.fullName',
        'users.email',
        'users.status',
        'users.emailVerificationSentAt', // Changed from email_verification_sent_at
        'organizations.name as organizationName'
      ])
      .where('users.email', '=', email.toLowerCase().trim())
      .executeTakeFirst();

    // Don't reveal if email exists or not
    if (!user) {
      return { message: 'If that email exists and is unverified, a verification email has been sent.' };
    }

    // Check if already verified
    if (user.status !== 'unverified') {
      return { message: 'Email is already verified.' };
    }

    // Rate limiting - don't allow resend within 1 minute
    if (user.emailVerificationSentAt) {
      const oneMinuteAgo = new Date();
      oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);
      
      if (user.emailVerificationSentAt > oneMinuteAgo) {
        throw new BadRequestError('Please wait before requesting another verification email.');
      }
    }

    // Generate and send new verification token
    await this.generateAndSendVerificationToken(
      user.id,
      user.email,
      user.fullName,
      user.organizationName
    );

    return { message: 'Verification email sent.' };
  }

  /**
   * Generates a verification token and sends verification email.
   * Token expiration is calculated dynamically based on emailVerificationSentAt 
   * timestamp + EMAIL_VERIFICATION_EXP config (default 6 hours).
   */
  private async generateAndSendVerificationToken(
    userId: number, 
    email: string, 
    fullName: string, 
    organizationName: string
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');

    // Store verification token with sent timestamp
    // Expiration is calculated dynamically using config.EMAIL_VERIFICATION_EXP
    await this.db
      .updateTable('users')
      .set({
        emailVerificationToken: token,
        emailVerificationSentAt: new Date(),
      })
      .where('id', '=', userId)
      .execute();

    // Generate verification URL
    const verificationUrl = `${config.FRONTEND_URL}/verify-email/${token}`;

    // Send verification email
    await this.emailService.sendEmailVerification({
      to: email,
      name: fullName,
      organizationName,
      verificationUrl,
    });

    return token;
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
        'u.status',
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

    const policies = getPoliciesForRole(profile.role);

    return {
      ...profile,
      policies: policies.map((p) => p),
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
  ): Promise<{ message: string; userId: number }> {
    
    // Check if user has permission to add users to this organization
    checkAccess(context, 'add-users', context.organizationId === organizationId || context.role === Role.Administrator);

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
        status: 'unverified', // Start as unverified
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Generate and send verification token
    await this.generateAndSendVerificationToken(
      user.id,
      user.email,
      user.fullName,
      organization.name
    );

    return {
      message: 'User created successfully. They will receive an email to verify their account.',
      userId: user.id
    };
  }
}
