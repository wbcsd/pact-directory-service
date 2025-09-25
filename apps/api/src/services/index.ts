import { Kysely } from 'kysely';
import { Database } from '../database/types';
import { AuthService } from './auth-service';
import { EmailService } from './email-service';
import { CompanyService } from './company-service';
import { TestRunService } from './test-run-service';
// import { UserService } from './user-service';
// import { OrganizationService } from './organization-service';
// import { EnvironmentService } from './environment-service';
// import { ConnectionService } from './connection-service';

// Export individual service classes for direct usage if needed
export { AuthService } from './auth-service';
// export { UserService } from './user-service';
// export { OrganizationService } from './organization-service';
// export { EnvironmentService } from './environment-service';
// export { ConnectionService } from './connection-service';

export interface Services {
  auth: AuthService;
  email: EmailService;
  company: CompanyService;
  testRun: TestRunService;
  // user: UserService;
  // organization: OrganizationService;
  // environment: EnvironmentService;
  // connection: ConnectionService;
}

export class ServiceContainer implements Services {
    auth: AuthService;
    email: EmailService;
    company: CompanyService;
    testRun: TestRunService;
    // user: UserService
    // organization: OrganizationService
    // environment: EnvironmentService
    // connection: ConnectionService
    
    constructor(db: Kysely<Database>) {
        this.email = new EmailService();
        this.auth = new AuthService(db);
        this.company = new CompanyService(db, this.email);
        this.testRun = new TestRunService(db);
        // this.user = new UserService(db);
        // this.organization = new OrganizationService(db);
        // this.environment = new EnvironmentService(db);
        // this.connection = new ConnectionService(db);
    }
}


