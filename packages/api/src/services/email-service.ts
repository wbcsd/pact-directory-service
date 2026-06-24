import config from '@src/common/config';
import logger from '@src/common/logger';
import Mailjet from 'node-mailjet';

/**
 * Convert a subset of HTML to plain text.
 *
 * Rules applied in order:
 *   <hN>…</hN>         → repeated '#' followed by the heading text
 *   <a href="…">…</a>  → link-text <url>
 *   <p>…</p>           → paragraph text followed by a blank line
 *   <br> / <br/>       → newline
 *   all remaining tags → stripped
 */
export function htmlToText(html: string): string {
  // Null-byte placeholders protect the angle brackets around URLs from
  // the final "strip all remaining tags" step.
  const OPEN = '\x00LT\x00';
  const CLOSE = '\x00GT\x00';

  return html
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').trim();
      return `${'#'.repeat(Number(level))} ${text}\n\n`;
    })
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, url: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').trim();
      return text ? `${text} ${OPEN}${url}${CLOSE}` : `${OPEN}${url}${CLOSE}`;
    })
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').trim();
      return `${text}\n\n`;
    })
    .replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, (_, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').trim();
      return `${text}\n\n`;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\x00LT\x00/g, '<')
    .replace(/\x00GT\x00/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface SendNotificationEmailParams {
  to: string;
  name: string;
  organizationName: string;
}

interface SendConnectionAcceptedEmailParams {
  to: string;
  name: string;
  fromNodeName: string;
  fromOrganizationName: string;
}

interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

interface SendFeedbackEmailParams {
  to: string;
  senderName: string;
  senderEmail: string;
  organizationName: string;
  role: string;
  pagePath: string;
  pageTitle?: string;
  message: string;
}

/**
 * EmailService handles sending various transactional emails using Mailjet. If the
 * MAIL_API_KEY or MAIL_API_SECRET configuration values are missing, it will log the email
 * content instead of sending, allowing the application to function without a 
 * configured email provider in development environments.
 */
export class EmailService {
  private mailjet?: InstanceType<typeof Mailjet.Client>;
  private mockMode: boolean;

  constructor() {
    this.mockMode = !config.MAIL_API_KEY.trim() || !config.MAIL_API_SECRET.trim();

    if (!this.mockMode) {
      this.mailjet = Mailjet.apiConnect(
        config.MAIL_API_KEY,
        config.MAIL_API_SECRET,
      );
    }
  }

  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    const wrappedHtml = `
      <div style="font-family: Helvetica, Arial, sans-serif; font-size: 14px; max-width: 600px; margin: 0 auto;">
        ${params.html}
        <p>
          PACT Network<br/>
          <a href="${config.FRONTEND_URL}">${config.FRONTEND_URL}</a><br/>
          Part of the World Business Council for Sustainable Development (<a href="https://www.wbcsd.org">WBCSD</a>)
        </p>
      </div>
    `;
    const text = params.text ?? htmlToText(wrappedHtml);

    if (this.mockMode) {
      logger.debug('--- MAILJET MOCK SEND ---');
      logger.debug({ ...params, text, html: wrappedHtml });
      logger.debug('--- END MAILJET MOCK SEND ---');
      return;
    }

    if (this.mailjet) {
      await this.mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: config.MAIL_FROM_EMAIL,
              Name: config.MAIL_FROM_NAME,
            },
            To: [{ Email: params.to }],
            Subject: params.subject,
            TextPart: text,
            HTMLPart: wrappedHtml,
          },
        ],
      });
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
        <h2>Welcome to the PACT Network!</h2>
        <p>Hi ${name},</p>
        <p>An administrator from ${organizationName} has created an account on the PACT Network for you. To get started, please set your password by clicking the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setupUrl}"
            style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Set Your Password
          </a>
        </div>
        <p>This link will expire in 72 hours.</p>
        <p>If you didn't expect this email or believe you received it by mistake, please contact your administrator.</p>
    `;

    await this.sendEmail({
      to,
      subject: `Set your password for ${organizationName}`,
      html: htmlContent,
    });
    logger.info(`Password setup email sent to ${to}`);
  }

  async sendEmailVerification(params: {
    to: string;
    name: string;
    organizationName: string;
    verificationUrl: string;
  }): Promise<void> {
    const { to, name, organizationName, verificationUrl } = params;

    const htmlContent = `
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
    `;

    await this.sendEmail({
      to,
      subject: `Please verify your email address for ${organizationName}`,
      html: htmlContent,
    });
    logger.info(`Email verification sent to ${to}`);
  }
  
  async sendConnectionRequestEmail({
    to,
    name,
    organizationName: companyName,
  }: SendNotificationEmailParams) {
    const htmlContent = `
        <p>Hello ${name},</p>
        <p>${companyName} has requested to connect with your organization on the PACT Network.
           Please log in to your account to accept or reject the request.</p>
        <p>You can manage your connections from ${config.FRONTEND_URL}/manage-connections</p>
    `;
    await this.sendEmail({
      to,
      subject: 'Connection Request from PACT Network',
      html: htmlContent,
    });
    logger.info(`Email sent to ${name}`);
  }

  async sendConnectionAcceptedEmail({
    to,
    name,
    fromNodeName,
    fromOrganizationName,
  }: SendConnectionAcceptedEmailParams) {
    const htmlContent = `
        <p>Hello ${name},</p>
        <p>Your connection invitation from node <strong>${fromNodeName}</strong>
           (${fromOrganizationName}) has been accepted on the PACT Network.</p>
        <p>You can now exchange data with this node. Log in to manage your connections:</p>
        <p><a href="${config.FRONTEND_URL}">${config.FRONTEND_URL}</a></p>
    `;
    await this.sendEmail({
      to,
      subject: 'Connection Invitation Accepted — PACT Network',
      html: htmlContent,
    });
    logger.info(`Connection accepted email sent to ${to}`);
  }

  async sendPasswordResetEmail({
    to,
    name,
    resetUrl,
  }: SendPasswordResetEmailParams): Promise<void> {
    const htmlContent = `
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
        <p style="word-break: break-all; color: #0A0552;">${resetUrl}</p>
        <p>
          If you didn't request this reset, please ignore this email.
          Your password will not be changed.
        </p>
    `;

    await this.sendEmail({
      to,
      subject: 'Password Reset Request - PACT Network',
      html: htmlContent,
    });
    logger.info(`Password reset email sent to ${to}`);
  }

  async sendFeedbackEmail({
    to,
    senderName,
    senderEmail,
    organizationName,
    role,
    pagePath,
    pageTitle,
    message,
  }: SendFeedbackEmailParams): Promise<void> {
    const htmlContent = `
        <h2>PACT Network Feedback</h2>
        <p>Sender: ${senderName}</p>
        <p>Email: ${senderEmail}</p>
        <p>Organization: ${organizationName}</p>
        <p>Role: ${role}</p>
        <p>Page: ${pagePath}</p>
        ${pageTitle ? `<p>Page title: ${pageTitle}</p>` : ''}
        <hr />
        <p>Feedback message</p>
        <p>${message}</p>
    `;

    await this.sendEmail({
      to,
      subject: `PACT Network feedback from ${senderName}`,
      html: htmlContent,
    });
    logger.info(`Feedback email sent to ${to}`);
  }
}
