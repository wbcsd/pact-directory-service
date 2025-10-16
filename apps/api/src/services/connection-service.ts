import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@src/common/errors';
import { OrganizationService } from './organization-service';
import { EmailService } from './email-service';
import { UserContext } from './user-service';
import { checkAccess, Role } from '@src/common/policies';


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
    context: UserContext,
    organizationId: number
  ): Promise<Connection[]> {
    checkAccess(context, 'view-connections-own-organization', context.organizationId === organizationId);
    checkAccess(context, 'view-connections-all-organizations');
    const connections = await this.db
      .selectFrom('connections')
      .selectAll()
      .where((e) => e.or([
        e('connectedCompanyOneId', '=', organizationId),
        e('connectedCompanyTwoId', '=', organizationId)
      ]))
      .execute();
    return connections;
  }

  async listConnectionRequests(
    context: UserContext,
    organizationId: number
  ): Promise<ConnectionRequest[]> {
    // This is the connection request sent by the current user on behalf of
    // their company
    const connectionRequests = await this.db
      .selectFrom('connection_requests')
      .selectAll()
      .where((e) => e.or([
        e('requestingCompanyId', '=', organizationId),
        e('requestedCompanyId', '=', organizationId)
      ]))
      .execute();
    return connectionRequests;
  }

  /**
   * Create a connection request
   */
  async createConnectionRequest(
    context: UserContext, 
    requestedOrganizationId: number,
    requestingOrganizationId: number
  ): Promise<ConnectionRequest> {

    if (!requestedOrganizationId) {
      throw new BadRequestError('Requested organization ID is required');
    }

    if (requestingOrganizationId === requestedOrganizationId) {
      throw new BadRequestError('You cannot connect with yourself');
    }

    if (context.role !== Role.Administrator) {
      throw new ForbiddenError('You are not allowed to send connection requests');
    }

    const requesting = await this.organizationService.get(context, requestingOrganizationId);
    const requested = await this.organizationService.get(context, requestedOrganizationId);

    if (!requesting) {
      throw new NotFoundError('Requesting organization not found');
    }
    if (!requested) {
      throw new NotFoundError('Requested organization not found');
    }

    // Ensure the user is either an admin of the requesting organization or a member of a child organization
    if (context.organizationId !== requestingOrganizationId) {
      const subOrgs = await this.organizationService.listSubOrganizations(context.organizationId);
      if (!subOrgs.find(o => o.id === requestingOrganizationId)) {
        throw new ForbiddenError('Can only send an invitation from a child organization or your own organization');
      }
    }

    const result = await this.db
      .insertInto('connection_requests')
      .values({
        requestingCompanyId: requestingOrganizationId,
        requestedCompanyId: requestedOrganizationId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Send email to requested organization
    await this.emailService.sendConnectionRequestEmail({
      to: context.email, // TODO: Add administrative email or primary contact of requested organization
      name: requested.organizationName,
      organizationName: requesting.organizationName,
    });

    return result;
  }

  async acceptConnectionRequest(requestId: number, currentOrganizationId: number): Promise<void> {

    if (!requestId) {
      throw new BadRequestError('Request ID is required');
    }

    const connectionRequest = await this.db
      .selectFrom('connection_requests')
      .selectAll()
      .where('id', '=', requestId)
      .executeTakeFirst();

    if (!connectionRequest) {
      throw new NotFoundError('Connection request not found');
    }

    if (connectionRequest.requestedCompanyId !== currentOrganizationId) {
      throw new ForbiddenError(
        'Only the requested company can accept the request'
      );
    }

    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('connections')
        .values({
          connectedCompanyOneId: connectionRequest.requestingCompanyId,
          connectedCompanyTwoId: connectionRequest.requestedCompanyId,
          createdAt: new Date(),
          requestedAt: connectionRequest.createdAt,
        })
        .execute();

      await this.db.transaction().execute(async (trx) => {
        await trx
          .updateTable('connection_requests')
          .set({ status: 'accepted' })
          .where('id', '=', requestId)
          .execute();
      });
    });

  }

  async rejectConnectionRequest(requestId: number, currentCompanyId: number): Promise<void> {
    if (!requestId) {
      throw new BadRequestError('Request ID is required');
    }

    const connectionRequest = await this.db
      .selectFrom('connection_requests')
      .selectAll()
      .where('id', '=', requestId)
      .executeTakeFirst();

    if (!connectionRequest) {
      throw new NotFoundError('Connection request not found');
    }

    if (connectionRequest.requestedCompanyId !== currentCompanyId) {
      throw new ForbiddenError(
        'Only the requested company can reject the request'
      );
    }

    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('connection_requests')
        .set({ status: 'rejected' })
        .where('id', '=', requestId)
        .execute();
    });
  }

}
