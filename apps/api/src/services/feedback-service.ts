import config from '@src/common/config';
import {
  BadRequestError,
  NotFoundError,
} from '@src/common/errors';
import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { EmailService } from './email-service';
import { UserContext } from './user-service';

export interface FeedbackSubmissionData {
  message: string;
  pagePath: string;
  pageTitle?: string;
}

interface FeedbackSenderDetails {
  fullName: string;
  email: string;
  organizationName: string;
}

export class FeedbackService {
  constructor(
    private db: Kysely<Database>,
    private emailService: EmailService,
  ) {}

  async submit(context: UserContext, data: FeedbackSubmissionData) {
    const message = data.message?.trim();
    const pagePath = data.pagePath?.trim();
    const pageTitle = data.pageTitle?.trim();

    if (!message) {
      throw new BadRequestError('Feedback message is required.');
    }

    if (!pagePath) {
      throw new BadRequestError('Page path is required.');
    }

    const sender = await this.getSenderDetails(context.userId);

    await this.emailService.sendFeedbackEmail({
      to: config.FEEDBACK_TO_EMAIL,
      senderName: sender.fullName,
      senderEmail: sender.email,
      organizationName: sender.organizationName,
      role: context.role,
      pagePath,
      pageTitle,
      message,
    });

    return { message: 'Feedback sent successfully.' };
  }

  private async getSenderDetails(userId: number): Promise<FeedbackSenderDetails> {
    const sender = await this.db
      .selectFrom('users')
      .innerJoin('organizations', 'organizations.id', 'users.organizationId')
      .select([
        'users.fullName as fullName',
        'users.email as email',
        'organizations.name as organizationName',
      ])
      .where('users.id', '=', userId)
      .executeTakeFirst();

    if (!sender) {
      throw new NotFoundError('Authenticated user not found.');
    }

    return sender;
  }
}