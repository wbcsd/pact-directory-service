/* eslint-disable @typescript-eslint/no-unused-vars */
import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { BadRequestError } from '@src/common/errors';
import { OrganizationService } from './organization-service';
import { EmailService } from './email-service';
import { UserContext } from './user-service';
import { ListQuery, ListResult } from '@src/common/list-query';

/**
 * DEPRECATED: This service is being replaced by NodeService and NodeConnectionService
 * as part of T#139 migration. The database schema has changed from
 * organization-based connections to node-based connections.
 * 
 * See: MIGRATION_PACT_NODE_002.md for details
 * 
 * This stub implementation prevents build errors during migration.
 * These interfaces and methods will be removed once NodeService is implemented (T#140/004).
 */

export interface ConnectionRequest {
  id: number;
  requestingCompanyId: number;
  requestedCompanyId: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface Connection {
  id: number;
  connectedCompanyOneId: number;
  connectedCompanyTwoId: number;
  createdAt: Date;
  requestedAt: Date;
}

export class ConnectionService {

  constructor(
      private db: Kysely<Database>,
      private organizationService: OrganizationService,
      private emailService: EmailService
  ) {} 
 
  async listConnections(
    _context: UserContext,
    _organizationId: number,
    _query: ListQuery = ListQuery.default()
  ): Promise<ListResult<Connection>> {
    // STUB: This method is deprecated and will be replaced by NodeConnectionService
    // Temporarily returning empty results to prevent build errors
    throw new BadRequestError('Connection API is being migrated to node-based system. Please use the new nodes API.');
  }
   
  async listConnectionRequests(
    _context: UserContext,
    _organizationId: number,
    _query: ListQuery
  ): Promise<ListResult<ConnectionRequest>> {
    // STUB: This method is deprecated and will be replaced by NodeConnectionService
    throw new BadRequestError('Connection API is being migrated to node-based system. Please use the new nodes API.');
  }

  /**
   * Create a connection request
   */
  async createConnectionRequest(
    _context: UserContext, 
    _requestingOrganizationId: number,
    _requestedOrganizationId: number,
  ): Promise<ConnectionRequest> {
    // STUB: This method is deprecated and will be replaced by NodeConnectionService
    throw new BadRequestError('Connection API is being migrated to node-based system. Please use the new nodes API.');
  }

  async acceptConnectionRequest(_requestId: number, _currentOrganizationId: number): Promise<void> {
    // STUB: This method is deprecated and will be replaced by NodeConnectionService
    throw new BadRequestError('Connection API is being migrated to node-based system. Please use the new nodes API.');
  }

  async rejectConnectionRequest(_requestId: number, _currentCompanyId: number): Promise<void> {
    // STUB: This method is deprecated and will be replaced by NodeConnectionService
    throw new BadRequestError('Connection API is being migrated to node-based system. Please use the new nodes API.');
  }

}
