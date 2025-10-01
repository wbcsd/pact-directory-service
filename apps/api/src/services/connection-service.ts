import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@src/common/errors';
import { OrganizationService } from './organization-service';
import { EmailService } from './email-service';
import { UserProfile } from './user-service';


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

  async listConnections(companyId: number): Promise<Connection[]> {
    const connections = await this.db
      .selectFrom('connections')
      .selectAll()
      .where((e) => e.or([
        e('connectedCompanyOneId', '=', companyId),
        e('connectedCompanyTwoId', '=', companyId)
      ]))
      .execute();
    return connections;
  }

  async listConnectionRequests(companyId: number): Promise<ConnectionRequest[]> {
    // This is the connection request sent by the current user on behalf of
    // their company
    const connectionRequests = await this.db
      .selectFrom('connection_requests')
      .selectAll()
      .where((e) => e.or([
        e('requestingCompanyId', '=', companyId),
        e('requestedCompanyId', '=', companyId)
      ]))
      .execute();
    return connectionRequests;
  }

  /**
   * Create a connection request
   */
  async createConnectionRequest(
    context: UserProfile, 
    requestedCompanyId: number,
    requestingCompanyId: number
  ): Promise<ConnectionRequest> {

    if (!requestedCompanyId) {
      throw new BadRequestError('Requested company ID is required');
    }

    if (requestingCompanyId === requestedCompanyId) {
      throw new BadRequestError('You cannot connect with yourself');
    }

    if (context.role !== 'administrator') {
      throw new ForbiddenError('You are not allowed to send connection requests');
    }

    const requesting = await this.organizationService.get(requestingCompanyId);
    const requested = await this.organizationService.get(requestedCompanyId);

    if (!requesting) {
      throw new NotFoundError('Requesting company not found');
    }
    if (!requested) {
      throw new NotFoundError('Requested company not found');
    }

    // Ensure the user is either an admin of the requesting company or a member of a child organization
    if (context.companyId !== requestingCompanyId) {
      const subOrgs = await this.organizationService.listSubOrganizations(context.companyId);
      if (!subOrgs.find(o => o.id === requestingCompanyId)) {
        throw new ForbiddenError('Can only send an invitation from a child organization or your own organization');
      }
    }

    const result = await this.db
      .insertInto('connection_requests')
      .values({
        requestingCompanyId: requestingCompanyId,
        requestedCompanyId: requestedCompanyId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Send email to requested company
    await this.emailService.sendConnectionRequestEmail({
      to: context.email, // TODO: Add administrative email or primary contact of requested company
      name: requested.companyName,
      companyName: requesting.companyName,
    });

    return result;
  }

  async acceptConnectionRequest(requestId: number, currentCompanyId: number): Promise<void> {

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
