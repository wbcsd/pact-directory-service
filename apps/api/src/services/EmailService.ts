import logger from "jet-logger";
import sgMail from "@sendgrid/mail";
import EnvVars from "@src/common/EnvVars";

sgMail.setApiKey(EnvVars.Sendgrid.ApiKey);

interface SendNotificationEmailParams {
  to: string;
  name: string;
  companyName: string;
}

export async function sendWelcomeEmail({
  to,
  name,
  companyName,
}: SendNotificationEmailParams): Promise<void> {
  const msg = {
    to,
    from: EnvVars.Sendgrid.FromEmail, // Use the email address or domain you verified with SendGrid
    subject: "Welcome to PACT Network",
    text: `Hello ${name},\n\nWelcome to PACT Network! We're excited to have you on board. Thank you for registering your organization, ${companyName}.\n\nBest regards,\nThe PACT Network Team`,
    html: `<p>Hello ${name},</p><p>Welcome to PACT Network! We're excited to have you on board. Thank you for registering your organization, ${companyName}.</p><p>Best regards,<br>The PACT Network</p>`,
  };

  try {
    await sgMail.send(msg);
    logger.info(`Email sent to ${name}`);
  } catch (error) {
    logger.err(error);
  }
}

export async function sendConnectionRequestEmail({
  to,
  name,
  companyName,
}: SendNotificationEmailParams): Promise<void> {
  const msg = {
    to,
    from: EnvVars.Sendgrid.FromEmail, // Use the email address or domain you verified with SendGrid
    subject: "Connection Request from PACT Network",
    text: `Hello ${name},\n\n${companyName} has requested to connect with your organization on the PACT Network. Please log in to your account to accept or reject the request.\n\nBest regards,\nThe PACT Network Team`,
    html: `<p>Hello ${name},</p><p>${companyName} has requested to connect with your organization on the PACT Network. Please log in to your account to accept or reject the request.</p><p>You can manage your connections from https://pact-directory-portal.onrender.com/manage-connections</p><p>Best regards,<br>The PACT Network</p>`,
  };

  try {
    await sgMail.send(msg);
    logger.info(`Email sent to ${name}`);
  } catch (error) {
    logger.err(error);
  }
}
