import config from '@src/common/config';
import logger from '@src/util/logger';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(config.SENDGRID_API_KEY);

interface SendNotificationEmailParams {
  to: string;
  name: string;
  companyName: string;
}

interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

export class EmailService {
  async sendWelcomeEmail({
    to,
    name,
    companyName,
  }: SendNotificationEmailParams) {
    const msg = {
      to,
      from: config.SENDGRID_FROM_EMAIL, // Use the email address or domain you verified with SendGrid
      subject: 'Welcome to PACT Network',
      text: `Hello ${name},\n\nWelcome to PACT Network! We're excited to have you on board. Thank you for registering your organization, ${companyName}.\n\nBest regards,\nThe PACT Network Team`,
      html: `<p>Hello ${name},</p><p>Welcome to PACT Network! We're excited to have you on board. Thank you for registering your organization, ${companyName}.</p><p>Best regards,<br>The PACT Network</p>`,
    };

    try {
      await sgMail.send(msg);
      logger.info(`Email sent to ${name}`);
    } catch (error) {
      logger.error('sendWelcomeEmail error', error);
    }
  }

  async sendConnectionRequestEmail({
    to,
    name,
    companyName,
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
