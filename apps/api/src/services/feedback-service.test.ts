import config from '@src/common/config';
import { BadRequestError } from '@src/common/errors';
import { createMockDatabase } from '../common/mock-utils';
import { EmailService } from './email-service';
import { FeedbackService } from './feedback-service';
import { Role } from '@src/common/policies';
import { UserContext } from './user-service';

jest.mock('@src/common/config');

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let mockEmailService: jest.Mocked<EmailService>;

  const context: UserContext = {
    userId: 10,
    email: 'user@example.com',
    organizationId: 20,
    role: Role.Administrator,
    policies: [],
    status: 'enabled',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dbMocks = createMockDatabase();
    mockEmailService = {
      sendFeedbackEmail: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    (config as any).NODE_ENV = 'test';
    (config as any).FEEDBACK_TO_EMAIL = 'pact-support@wbcsd.org';

    feedbackService = new FeedbackService(dbMocks.db as any, mockEmailService);
  });

  it('sends feedback email with derived sender details', async () => {
    dbMocks.executors.executeTakeFirst.mockResolvedValue({
      fullName: 'Test User',
      email: 'user@example.com',
      organizationName: 'PACT Org',
    });

    const result = await feedbackService.submit(context, {
      message: 'The page is missing a filter option.',
      pagePath: '/nodes/12?tab=logs',
      pageTitle: 'Node Dashboard',
    });

    expect(result).toEqual({ message: 'Feedback sent successfully.' });
    expect(mockEmailService.sendFeedbackEmail).toHaveBeenCalledWith({
      to: 'pact-support@wbcsd.org',
      senderName: 'Test User',
      senderEmail: 'user@example.com',
      organizationName: 'PACT Org',
      role: Role.Administrator,
      pagePath: '/nodes/12?tab=logs',
      pageTitle: 'Node Dashboard',
      message: 'The page is missing a filter option.',
    });
  });

  it('rejects requests without a message', async () => {
    await expect(
      feedbackService.submit(context, {
        message: '   ',
        pagePath: '/nodes/12',
      })
    ).rejects.toThrow(BadRequestError);
  });
});