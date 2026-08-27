import { Role } from '@src/common/policies';
import { Generated } from 'kysely';

export interface Database {
  organizations: OrganizationsTable;
  users: UsersTable;
  roles: RolesTable;
  policies: PoliciesTable;
  roles_policies: RolesPoliciesTable;
  nodes: NodesTable;
  connections: ConnectionTable;
  password_tokens: PasswordTokenTable;
  activity_logs: ActivityLogsTable;
  product_footprints: ProductFootprintsTable;
  pcf_requests: PcfRequestsTable;
  data_model_extensions: DataModelExtensionsTable;
  node_data_model_extensions: NodeDataModelExtensionsTable;
}

export interface OrganizationsTable {
  id: Generated<number>;
  parentId: number | null;
  uri: string;
  name: string;
  solutionApiUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  networkKey: string | null;
  description: string | null;
  status: 'active' | 'disabled';
}

export interface UsersTable {
  id: Generated<number>;
  fullName: string;
  email: string;
  role: Role;
  password: string;
  organizationId: number;
  status: 'unverified' | 'enabled' | 'disabled' | 'deleted';
  emailVerificationToken: string | null;
  emailVerificationSentAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  lastLogin: Date | null;
}

export interface RolesTable {
  name: string;
}

export interface PoliciesTable {
  name: string;
  description: string;
}

export interface RolesPoliciesTable {
  role: string;
  policy: string;
}

export interface NodesTable {
  id: Generated<number>;
  organizationId: number;
  name: string;
  type: 'internal' | 'external';
  apiUrl: string;
  status: 'active' | 'inactive' | 'pending';
  discoverable: Generated<boolean>;
  authBaseUrl: string | null;
  scope: string | null;
  audience: string | null;
  resource: string | null;
  specVersion: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface ConnectionTable {
  id: Generated<number>;
  fromNodeId: number;
  targetNodeId: number;
  /** Credentials the from node uses to authenticate against the target node. */
  clientId: string | null;
  clientSecret: string | null;
  /** 'generated' — issued by this directory; 'external' — issued by the external target's operator. */
  credentialsSource: Generated<'generated' | 'external'>;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  expiresAt: Date | null;
}

export interface PasswordTokenTable {
  id: Generated<number>;
  userId: number;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  type: 'reset' | 'setup';
  usedAt: Date | null;
}

export interface ActivityLogsTable {
  id: Generated<number>;
  path: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  content: Record<string, any>; // JSONB
  nodeId: number | null;
  organizationId: number | null;
  userId: number | null;
  createdAt: Generated<Date>;
}

export interface ProductFootprintsTable {
  id: string; // UUID — must equal data.id (the PACT footprint ID)
  nodeId: number;
  data: Record<string, any>; // JSONB
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface PcfRequestsTable {
  id: Generated<number>;
  fromNodeId: number | null;  // null for requests from external nodes without a directory record
  targetNodeId: number;
  connectionId: number | null; // null for incoming requests not yet matched to a connection
  requestEventId: string; // id of the sent CloudEvent
  source: string;  // source URL from CloudEvent — used as callback base
  filters: Record<string, unknown>; // JSONB — FootprintFilters
  status: 'pending' | 'fulfilled' | 'rejected';
  resultCount: number | null;
  fulfilledFootprintIds: unknown[] | null; // footprint IDs sent in RequestFulfilledEvent
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

/** Registry of known PACT data model extensions — see https://wbcsd.github.io/data-model-extensions/spec/ */
export interface DataModelExtensionsTable {
  id: Generated<number>;
  name: string;
  dataSchemaUrl: string; // URL of the extension schema file (spec § 4.3)
  documentationUrl: string | null;
  specVersion: Generated<string>; // version of the extension specification, e.g. '2.0.0'
  version: string | null; // semantic version of the extension itself
  description: string | null;
  author: string | null;
  contactEmail: string | null;
  status: Generated<'active' | 'deprecated'>;
  schemaJson: Record<string, unknown> | null; // JSONB — cached extension schema file
  schemaFetchedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface NodeDataModelExtensionsTable {
  nodeId: number;
  extensionId: number;
  createdAt: Generated<Date>;
}
