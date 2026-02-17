import { Kysely } from 'kysely';
import { Database } from '../database/types';
import { AuthService } from './auth-service';
import { EmailService } from './email-service';
import { OrganizationService } from './organization-service';
import { TestRunService } from './test-run-service';
import { UserService } from './user-service';
import { ConnectionService } from './connection-service';
import { NodeService } from './node-service';
import { NodeConnectionService } from './node-connection-service';
import { InternalNodePactService } from './internal-node-pact-service';
import { InternalNodeAuthService } from './internal-node-auth-service';
import { ActivityLogService } from './activity-log-service';
import config from '../common/config';

// Export individual service classes for direct usage if needed
export { AuthService } from './auth-service';
export { UserService } from './user-service';
export { OrganizationService } from './organization-service';
export { ConnectionService } from './connection-service';
export { NodeService } from './node-service';
export { NodeConnectionService } from './node-connection-service';
export { InternalNodePactService } from './internal-node-pact-service';
export { InternalNodeAuthService } from './internal-node-auth-service';
export { ActivityLogService } from './activity-log-service';

export interface Services {
  auth: AuthService;
  email: EmailService;
  organization: OrganizationService;
  testRun: TestRunService;
  user: UserService;
  connection: ConnectionService;
  node: NodeService;
  nodeConnection: NodeConnectionService;
  internalNodePact: InternalNodePactService;
  internalNodeAuth: InternalNodeAuthService;
  activityLog: ActivityLogService;
}

export class ServiceContainer implements Services {
  auth: AuthService;
  email: EmailService;
  organization: OrganizationService;
  user: UserService;
  connection: ConnectionService;
  testRun: TestRunService;
  node: NodeService;
  nodeConnection: NodeConnectionService;
  internalNodePact: InternalNodePactService;
  internalNodeAuth: InternalNodeAuthService;
  activityLog: ActivityLogService;

  constructor(db: Kysely<Database>) {
    this.email = new EmailService();
    this.auth = new AuthService(db);
    this.organization = new OrganizationService(db, this.email);
    this.connection = new ConnectionService(db, this.organization, this.email);
    this.user = new UserService(db, this.email);
    this.testRun = new TestRunService(db, this.user, this.organization);
    this.node = new NodeService(db);
    this.internalNodePact = new InternalNodePactService();
    this.internalNodeAuth = new InternalNodeAuthService(db);
    this.nodeConnection = new NodeConnectionService(
      db,
      this.node,
      this.email,
      config.INTERNAL_API_BASE_URL
    );
    this.activityLog = new ActivityLogService(db);
    // this.environment = new EnvironmentService(db);
  }
}
