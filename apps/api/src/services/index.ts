import { Kysely } from 'kysely';
import { Database } from '../database/types';
import { AuthService } from './auth-service';
import { EmailService } from './email-service';
import { OrganizationService } from './organization-service';
import { TestRunService } from './test-run-service';
import { UserService } from './user-service';
import { ConnectionService } from './connection-service';

// Export individual service classes for direct usage if needed
export { AuthService } from './auth-service';
export { UserService } from './user-service';
export { OrganizationService } from './organization-service';
export { ConnectionService } from './connection-service';

export interface Services {
  auth: AuthService;
  email: EmailService;
  organization: OrganizationService;
  testRun: TestRunService;
  user: UserService;
  connection: ConnectionService;
}

export class ServiceContainer implements Services {
  auth: AuthService;
  email: EmailService;
  organization: OrganizationService;
  user: UserService;
  connection: ConnectionService;
  testRun: TestRunService;

  constructor(db: Kysely<Database>) {
    this.email = new EmailService();
    this.auth = new AuthService(db);
    this.organization = new OrganizationService(db, this.email);
    this.connection = new ConnectionService(db, this.organization, this.email);
    this.user = new UserService(db, this.email);
    this.testRun = new TestRunService(db, this.user, this.organization);
    // this.environment = new EnvironmentService(db);
  }
}
