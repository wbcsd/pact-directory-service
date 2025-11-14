import bcrypt from 'bcrypt';
import crypto from 'crypto';
import config from '@src/common/config';
import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '@src/common/errors';
import { EmailService } from './email-service';
import {
  getPoliciesForRole,
  registerPolicy,
  Role,
} from '@src/common/policies';
import logger from '@src/common/logger';

registerPolicy([Role.Administrator, Role.Root], 'view-users');
registerPolicy([Role.Administrator, Role.Root], 'edit-users');
registerPolicy([Role.Root], 'view-all-users');
registerPolicy([Role.Root], 'edit-all-users');

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
  organizationDescription?: string | null;
  solutionApiUrl?: string | null;
  policies?: string[];
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

export interface SetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export class UserService {
  // TODO: Remove

  private readonly PASSWORD_SETUP_TOKEN_EXPIRATION = 72;

  constructor(
    private db: Kysely<Database>,
    private emailService: EmailService
  ) {}


  /**
 * Generate and send password setup token for admin-created users
 * 
 * This method generates a secure token that allows a user to set their password
 * for the first time. It follows a state machine pattern:
 * - Token starts in 'generated' state
 * - Can transition to 'used' (when password is set) or 'expired'
 * - Once used or expired, token cannot be reused
 * 
 * @param userId - The ID of the user who needs to set their password
 * @param email - The user's email address
 * @param fullName - The user's full name
 * @param organizationName - The name of the organization
 */
  private async generateAndSendPasswordSetupToken(
    userId: number,
    email: string,
    fullName: string,
    organizationName: string
  ): Promise<void> {
    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration (e.g., 72 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    // Store token in database with type='setup'
    await this.db
      .insertInto('password_tokens')
      .values({
        userId,
        token,
        type: 'setup', // Distinguish from 'reset' tokens
        createdAt: new Date(),
        expiresAt,
      })
      .execute();

    // Generate setup URL
    const setupUrl = `${config.FRONTEND_URL}/set-password/${token}`;

    // Send password setup email
    await this.emailService.sendPasswordSetupEmail({
      to: email,
      name: fullName,
      organizationName,
      setupUrl,
    });
  }

  /**
   * Verify password setup token
   * 
   * Checks if a token is valid for setting a password:
   * - Token must exist
   * - Status must be 'generated' (not already used)
   * - Must not be expired
   * 
   * @param token - The password setup token to verify
   * @returns Object indicating if token is valid
   * @throws {BadRequestError} If token is invalid, already used, or expired
   */
  async verifyPasswordSetupToken(token: string): Promise<{ 
    valid: boolean; 
    userId: number;
    email: string;
  }> {
    if (!token || typeof token !== 'string') {
      throw new BadRequestError('Token is required');
    }

    // Find token with user information
    const tokenRecord = await this.db
      .selectFrom('password_tokens')
      .innerJoin('users', 'password_tokens.userId', 'users.id')
      .select([
        'password_tokens.userId',
        'password_tokens.usedAt',
        'password_tokens.expiresAt',
        'users.email'
      ])
      .where('password_tokens.token', '=', token)
      .where('password_tokens.type', '=', 'setup')
      .executeTakeFirst();

    if (!tokenRecord) {
      throw new BadRequestError('Invalid setup token');
    }

    // Check if token is already used (derive status from usedAt)
    if (tokenRecord.usedAt !== null) {
      throw new BadRequestError('This setup link has already been used');
    }

    // Check if token is expired (derive status from expiresAt and current time)
    if (new Date() > tokenRecord.expiresAt) {
      throw new BadRequestError('Setup link has expired');
    }

    return {
      valid: true,
      userId: tokenRecord.userId,
      email: tokenRecord.email
    };
  }


  /**
 * NEW METHOD: Set password using setup token
 * 
 * Allows a user to set their password for the first time using a valid token.
 * This is the final step in the admin-created user flow.
 * 
 * State transition: 'generated' → 'used'
 * 
 * @param data - Object containing token and password
 * @returns Success message
 * @throws {BadRequestError} If validation fails or token is invalid
 */
  async setPasswordWithToken(data: SetPasswordData): Promise<{ message: string }> {
    const { token, password, confirmPassword } = data;

    // Validate input
    if (!token || typeof token !== 'string') {
      throw new BadRequestError('Token is required');
    }

    if (!password || typeof password !== 'string') {
      throw new BadRequestError('Password is required');
    }

    if (!confirmPassword || typeof confirmPassword !== 'string') {
      throw new BadRequestError('Password confirmation is required');
    }

    if (password !== confirmPassword) {
      throw new BadRequestError('Passwords do not match');
    }

    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long');
    }

    // Verify token is valid and get user ID
    const { userId } = await this.verifyPasswordSetupToken(token);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use transaction to ensure atomicity
    await this.db.transaction().execute(async (trx) => {
      // Update user password and status
      await trx
        .updateTable('users')
        .set({ 
          password: hashedPassword,
          status: 'enabled' // Activate the account
        })
        .where('id', '=', userId)
        .execute();

      // Mark token as used (state transition: GENERATED → USED)
      await trx
        .updateTable('password_tokens')
        .set({ 
          usedAt: new Date()
        })
        .where('token', '=', token)
        .execute();
    });

    return { 
      message: 'Password has been set successfully. You can now log in.' 
    };
  }


  /**
   * Helper function to normalize email addresses (trim and lowercase)
   */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

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

    // Normalize email: trim and lowercase
    const normalizedEmail = this.normalizeEmail(data.email);

    // Check if email already exists
    const emailExists = await this.db
      .selectFrom('users')
      .where('email', '=', normalizedEmail)
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
          status: 'active',
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      return await trx
        .insertInto('users')
        .values({
          fullName: data.fullName,
          email: normalizedEmail,
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
    // Normalize email: trim and lowercase
    const normalizedEmail = this.normalizeEmail(data.email);

    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', normalizedEmail)
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

    try {
      await this.db
        .updateTable('users')
        .set({ lastLogin: new Date() })
        .where('id', '=', user.id)
        .execute()
    } catch (error) {
      logger.error('Failed to update lastLogin for user:', user.id, error);
    }

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

    const allowed = context.userId === id || context.policies.includes('view-users') || context.policies.includes('view-all-users');
    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view this user');
    }
    
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
    
    if (user.organizationId !== context.organizationId && !context.policies.includes('view-all-users')) {
      throw new ForbiddenError('You are not allowed to view this user');
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
        'organizations.name as organizationName',
      ])
      .where('users.email', '=', this.normalizeEmail(email))
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
   * Get user's profile with basic user and organization info
   */
  async getMyProfile(
    email: string,
  ): Promise<UserData | null> {
    const profile = await this.db
      .selectFrom('organizations as o')
      .innerJoin('users as u', 'o.id', 'u.organizationId')
      .select([
        'u.id as id',
        'u.fullName',
        'u.email',
        'u.role',
        'u.status',
        'o.id as organizationId',
        'o.name as organizationName',
        'o.uri as organizationIdentifier',
        'o.description as organizationDescription',
        'o.solutionApiUrl',
      ])
      .where('u.email', '=', email)
      .executeTakeFirst();

    if (!profile) {
      throw new NotFoundError('User not found');
    }

    const policies = getPoliciesForRole(profile.role);

    return {
      ...profile,
      policies: policies.map((p) => p),
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
      .where('users.email', '=', this.normalizeEmail(email))
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
      .insertInto('password_tokens')
      .values({
        userId: user.id,
        token,
        type: 'reset',
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
      .selectFrom('password_tokens')
      .selectAll()
      .where('token', '=', token)
      .where('type', '=', 'reset')
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
      .updateTable('password_tokens')
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
      .selectFrom('password_tokens')
      .selectAll()
      .where('token', '=', token)
      .where('type', '=', 'reset')
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
 * NEW METHOD: Adds a new user to an organization WITHOUT requiring a password upfront
 * 
 * Admin creates the user without a password. The user receives an email
 * with a token to set their own password. This is an ALTERNATIVE to the 
 * existing addUserToOrganization method.
 * 
 * @param context - The admin user's context
 * @param organizationId - The ID of the organization to add the user to
 * @param data - The user data (no password required)
 * @returns A promise with success message and user ID
 */
  async addUserToOrganization(
    context: UserContext, 
    organizationId: number, 
    data: AddUserToOrganizationData
  ): Promise<{ message: string; userId: number }> {
    
    // Check if user has permission to add users to this organization
    const allowed = 
      context.policies.includes('edit-all-users') ||
      context.policies.includes('edit-users') || context.organizationId === organizationId;
    if (!allowed) {
      throw new ForbiddenError('You are not allowed to add users to this organization');
    }

    // Normalize email: trim and lowercase
    const normalizedEmail = this.normalizeEmail(data.email);

    // Check if email already exists
    const emailExists = await this.db
      .selectFrom('users')
      .where('email', '=', normalizedEmail)
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

    // Create user WITHOUT a password - they'll set it via token
    // Using a placeholder password that cannot be used for login
    const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    
    const user = await this.db
      .insertInto('users')
      .values({
        fullName: data.fullName,
        email: normalizedEmail,
        role: data.role,
        password: placeholderPassword, // Placeholder - user must set via token
        organizationId: organizationId,
        status: 'unverified', // Status remains unverified until password is set
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Generate and send password setup token
    await this.generateAndSendPasswordSetupToken(
      user.id,
      user.email,
      user.fullName,
      organization.name
    );

    return {
      message: 'User created successfully. They will receive an email to set their password.',
      userId: user.id
    };
  }
}
