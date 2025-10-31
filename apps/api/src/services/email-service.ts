import config from '@src/common/config';
import logger from '@src/common/logger';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(config.SENDGRID_API_KEY);

interface SendNotificationEmailParams {
  to: string;
  name: string;
  organizationName: string;
}

interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

export class EmailService {

  constructor() {
    // In development mode, mock the send function to avoid sending real emails
    if (config.NODE_ENV === 'development') {
      sgMail.send = async (msg: any) => {
        logger.debug('--- SENDGRID MOCK SEND ---');
        logger.debug(msg);
        logger.debug('--- END SENDGRID MOCK SEND ---');
        await Promise.resolve(); // Added await to satisfy linter
        return [{} as sgMail.ClientResponse, {}];
      }
    }
  }

  /**
   * Send password setup email to new user created by admin
   */
  async sendPasswordSetupEmail(params: {
    to: string;
    name: string;
    organizationName: string;
    setupUrl: string;
  }): Promise<void> {
    const { to, name, organizationName, setupUrl } = params;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to the PACT Network!</h2>
        <p>Hi ${name},</p>
        <p>An administrator from ${organizationName} has created an account for you. To get started, please set your password by clicking the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setupUrl}"
            style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Set Your Password
          </a>
        </div>
        <p>This link will expire in 72 hours.</p>
        <p>If you didn't expect this email or believe you received it by mistake, please contact your administrator.</p>
        <p>Best regards,<br>The PACT Team</p>
      </div>
    `;
    
    await sgMail.send({
      to,
      from: config.SENDGRID_FROM_EMAIL,
      subject: `Set your password for ${organizationName}`,
      html: htmlContent,
    });
  }

  async sendEmailVerification(params: {
    to: string;
    name: string;
    organizationName: string;
    verificationUrl: string;
  }): Promise<void> {
    const { to, name, organizationName, verificationUrl } = params;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to the PACT Network!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for registering with us. To complete your registration and activate your account, please verify your email address by clicking the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this account, you can safely ignore this email.</p>
        <p>Best regards,<br>The PACT Team</p>
      </div>
    `;

    const textContent = [
      `Hello ${name},`,
      '',
      'Thank you for registering with us. To complete your registration and activate your account, please verify your email address by clicking the link below:',
      '',
      verificationUrl,
      '',
      'This link will expire in 24 hours.',
      '',
      "If you didn't create this account, you can safely ignore this email.",
      '',
      'Best regards,',
      'The PACT Team',
    ].join('\n');

    try {
      await sgMail.send({
        to,
        from: config.SENDGRID_FROM_EMAIL,
        subject: `Please verify your email address for ${organizationName}`,
        html: htmlContent,
        text: textContent,
      });
      logger.info(`Email verification sent to ${to}`);
    } catch (error) {
      logger.error('sendEmailVerification error', error);
    }
  }
  
  async sendConnectionRequestEmail({
    to,
    name,
    organizationName: companyName,
  }: SendNotificationEmailParams) {
    const msg = {
      to,
      from: config.SENDGRID_FROM_EMAIL, // Use the email address or domain you verified with SendGrid
      subject: 'Connection Request from PACT Network',
      text: `Hello ${name},\n\n${companyName} has requested to connect with your organization on the PACT Network. Please log in to your account to accept or reject the request.\n\nBest regards,\nThe PACT Network Team`,
      html: `<p>Hello ${name},</p><p>${companyName} has requested to connect with your organization on the PACT Network. Please log in to your account to accept or reject the request.</p><p>You can manage your connections from https://pact-directory-portal.onrender.com/manage-connections</p><p>Best regards,<br>The PACT Network</p>`,
    };

    try {
      await sgMail.send(msg);
      logger.info(`Email sent to ${name}`);
    } catch (error) {
      logger.error('sendConnectionRequestEmail error', error);
    }
  }

  async sendPasswordResetEmail({
    to,
    name,
    resetUrl,
  }: SendPasswordResetEmailParams): Promise<void> {
    const textContent = [
      `Hello ${name},`,
      '',
      'We received a request to reset your password for your PACT Network account.',
      '',
      'Click the link below to reset your password (expires in 15 minutes):',
      resetUrl,
      '',
      "If you didn't request this reset, please ignore this email.",
      '',
      'Best regards,',
      'The PACT Network Team',
    ].join('\n');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0A0552;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password for your PACT Network account.</p>
        <p>Click the button below to reset your password (expires in 15 minutes):</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
            style="background-color: #0A0552; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you didn't request this reset, please ignore this email. 
          Your password will not be changed.
        </p>
        <p>Best regards,<br>The PACT Network Team</p>
      </div>
    `;

    const msg = {
      to,
      from: config.SENDGRID_FROM_EMAIL,
      subject: 'Password Reset Request - PACT Network',
      text: textContent,
      html: htmlContent,
    };

    try {
      await sgMail.send(msg);
      logger.info(`Password reset email sent to ${to}`);
    } catch (error) {
      logger.error('sendPasswordResetEmail error', error);
    }
  }

}
