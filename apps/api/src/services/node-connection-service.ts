import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@src/common/errors';
import { registerPolicy, Role } from '@src/common/policies';
import { UserContext } from './user-service';
import { NodeService } from './node-service';
import { EmailService } from './email-service';
import { ListQuery, ListResult } from '@src/common/list-query';
import crypto from 'crypto';

// Register policies
registerPolicy([Role.Administrator], 'manage-connections-own-nodes');
registerPolicy([Role.Root], 'manage-connections-all-nodes');

export interface NodeConnectionData {
  id: number;
  fromNodeId: number;
  targetNodeId: number;
  clientId: string;
  clientSecret: string; // Encrypted
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export interface ConnectionInvitationData {
  fromNodeId: number;
  targetNodeId: number;
  message?: string;
}

export interface ConnectionCredentials {
  clientId: string;
  clientSecret: string;
  connectionId: number;
}

export class NodeConnectionService {
  constructor(
    private db: Kysely<Database>,
    private nodeService: NodeService,
    private emailService: EmailService
  ) {}

  /**
   * Encrypt a secret using a simple encryption method
   * In production, use a proper encryption library like crypto with a secret key
   */
  private encryptSecret(secret: string): string {
    // Simple base64 encoding for now - in production use proper encryption
    // TODO: Implement proper AES encryption with a secret key from config
    return Buffer.from(secret).toString('base64');
  }

  /**
   * Decrypt a secret
   */
  private decryptSecret(encrypted: string): string {
    // Simple base64 decoding - in production use proper decryption
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }

  /**
   * Generate credentials for a connection
   */
  private generateCredentials(): { clientId: string; clientSecret: string } {
    const clientId = crypto.randomBytes(16).toString('hex');
    const clientSecret = crypto.randomBytes(32).toString('hex');
    return { clientId, clientSecret };
  }

  /**
   * Create an invitation (pending connection)
   */
  async createInvitation(
    context: UserContext,
    data: ConnectionInvitationData
  ): Promise<NodeConnectionData> {
    // Validate input
    if (!data.fromNodeId || !data.targetNodeId) {
      throw new BadRequestError('Both fromNodeId and targetNodeId are required');
    }

    if (data.fromNodeId === data.targetNodeId) {
      throw new BadRequestError('Cannot create connection to the same node');
    }

    // Get both nodes and check access
    const fromNode = await this.nodeService.get(context, data.fromNodeId);
    const targetNode = await this.nodeService.get(context, data.targetNodeId);

    // Check if user has permission to create connections from this node
    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === fromNode.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to create connections from this node');
    }

    // Check if connection already exists
    const existingConnection = await this.db
      .selectFrom('connections')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb.and([
            eb('fromNodeId', '=', data.fromNodeId),
            eb('targetNodeId', '=', data.targetNodeId),
          ]),
          eb.and([
            eb('fromNodeId', '=', data.targetNodeId),
            eb('targetNodeId', '=', data.fromNodeId),
          ]),
        ])
      )
      .executeTakeFirst();

    if (existingConnection) {
      throw new BadRequestError('A connection between these nodes already exists');
    }

    // Generate credentials
    const credentials = this.generateCredentials();

    // Create the connection with pending status
    const connection = await this.db
      .insertInto('connections')
      .values({
        fromNodeId: data.fromNodeId,
        targetNodeId: data.targetNodeId,
        clientId: credentials.clientId,
        clientSecret: this.encryptSecret(credentials.clientSecret),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Send email notification to target node's organization
    // TODO: Get organization admin emails for notification
    await this.emailService.sendConnectionRequestEmail({
      to: context.email, // Placeholder - should be target org admin
      name: targetNode.name,
      organizationName: fromNode.organizationName || 'Unknown Organization',
    });

    return connection as NodeConnectionData;
  }

  /**
   * List invitations received by a node
   */
  async listInvitations(
    context: UserContext,
    nodeId: number,
    query: ListQuery = ListQuery.default()
  ): Promise<ListResult<NodeConnectionData>> {
    // Get node and check access
    const node = await this.nodeService.get(context, nodeId);

    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view invitations for this node');
    }

    let qb = this.db
      .selectFrom('connections')
      .selectAll()
      .where('targetNodeId', '=', nodeId)
      .where('status', '=', 'pending');

    // Get total count
    const total = (
      await qb
        .clearSelect()
        .select((eb) => eb.fn.count('id').as('total'))
        .executeTakeFirstOrThrow()
    ).total as number;

    // Apply sorting
    qb = qb.orderBy('createdAt', query.sortOrder || 'desc');

    // Apply pagination
    const data = await qb.offset(query.offset).limit(query.limit).execute();

    return {
      data: data as NodeConnectionData[],
      pagination: query.pagination(total),
    };
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(
    context: UserContext,
    invitationId: number
  ): Promise<ConnectionCredentials> {
    // Get the invitation
    const invitation = await this.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', invitationId)
      .where('status', '=', 'pending')
      .executeTakeFirst();

    if (!invitation) {
      throw new NotFoundError('Invitation not found or already processed');
    }

    // Get target node and check access
    const targetNode = await this.nodeService.get(context, invitation.targetNodeId);

    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === targetNode.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to accept this invitation');
    }

    // Update connection status to accepted
    await this.db
      .updateTable('connections')
      .set({
        status: 'accepted',
        updatedAt: new Date(),
        // Set expiration to 1 year from now
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      })
      .where('id', '=', invitationId)
      .execute();

    // Return the decrypted credentials
    return {
      connectionId: invitation.id,
      clientId: invitation.clientId,
      clientSecret: this.decryptSecret(invitation.clientSecret),
    };
  }

  /**
   * Reject an invitation
   */
  async rejectInvitation(context: UserContext, invitationId: number): Promise<void> {
    // Get the invitation
    const invitation = await this.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', invitationId)
      .where('status', '=', 'pending')
      .executeTakeFirst();

    if (!invitation) {
      throw new NotFoundError('Invitation not found or already processed');
    }

    // Get target node and check access
    const targetNode = await this.nodeService.get(context, invitation.targetNodeId);

    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === targetNode.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to reject this invitation');
    }

    // Update connection status to rejected
    await this.db
      .updateTable('connections')
      .set({
        status: 'rejected',
        updatedAt: new Date(),
      })
      .where('id', '=', invitationId)
      .execute();
  }

  /**
   * List connections for a node
   */
  async listConnections(
    context: UserContext,
    nodeId: number,
    query: ListQuery = ListQuery.default()
  ): Promise<ListResult<NodeConnectionData>> {
    // Get node and check access
    const node = await this.nodeService.get(context, nodeId);

    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === node.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view connections for this node');
    }

    let qb = this.db
      .selectFrom('connections')
      .selectAll()
      .where((eb) =>
        eb.or([eb('fromNodeId', '=', nodeId), eb('targetNodeId', '=', nodeId)])
      )
      .where('status', '=', 'accepted');

    // Get total count
    const total = (
      await qb
        .clearSelect()
        .select((eb) => eb.fn.count('id').as('total'))
        .executeTakeFirstOrThrow()
    ).total as number;

    // Apply sorting
    qb = qb.orderBy('createdAt', query.sortOrder || 'desc');

    // Apply pagination
    const data = await qb.offset(query.offset).limit(query.limit).execute();

    return {
      data: data as NodeConnectionData[],
      pagination: query.pagination(total),
    };
  }

  /**
   * Remove a connection
   */
  async removeConnection(context: UserContext, connectionId: number): Promise<void> {
    // Get the connection
    const connection = await this.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', connectionId)
      .executeTakeFirst();

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Get both nodes to check access
    const fromNode = await this.nodeService.get(context, connection.fromNodeId);
    const targetNode = await this.nodeService.get(context, connection.targetNodeId);

    // User must have access to at least one of the nodes
    const hasAccessToFrom =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === fromNode.organizationId);

    const hasAccessToTarget =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === targetNode.organizationId);

    if (!hasAccessToFrom && !hasAccessToTarget) {
      throw new ForbiddenError('You are not allowed to remove this connection');
    }

    // Delete the connection
    await this.db
      .updateTable('connections')
      .set({
        status: 'rejected',
        updatedAt: new Date(),
      })
      .where('id', '=', connectionId)
      .execute();
  }

  /**
   * Rotate credentials for a connection
   */
  async rotateCredentials(
    context: UserContext,
    connectionId: number
  ): Promise<ConnectionCredentials> {
    // Get the connection
    const connection = await this.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', connectionId)
      .where('status', '=', 'accepted')
      .executeTakeFirst();

    if (!connection) {
      throw new NotFoundError('Connection not found or not active');
    }

    // Get from node and check access
    const fromNode = await this.nodeService.get(context, connection.fromNodeId);

    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === fromNode.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to rotate credentials for this connection');
    }

    // Generate new credentials
    const newCredentials = this.generateCredentials();

    // Update the connection
    await this.db
      .updateTable('connections')
      .set({
        clientId: newCredentials.clientId,
        clientSecret: this.encryptSecret(newCredentials.clientSecret),
        updatedAt: new Date(),
        // Extend expiration by 1 year
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      })
      .where('id', '=', connectionId)
      .execute();

    return {
      connectionId,
      clientId: newCredentials.clientId,
      clientSecret: newCredentials.clientSecret,
    };
  }

  /**
   * Get credentials for a connection (for the requesting node)
   */
  async getCredentials(
    context: UserContext,
    connectionId: number
  ): Promise<ConnectionCredentials> {
    // Get the connection
    const connection = await this.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', connectionId)
      .where('status', '=', 'accepted')
      .executeTakeFirst();

    if (!connection) {
      throw new NotFoundError('Connection not found or not active');
    }

    // Get from node and check access
    const fromNode = await this.nodeService.get(context, connection.fromNodeId);

    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === fromNode.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to view credentials for this connection');
    }

    return {
      connectionId: connection.id,
      clientId: connection.clientId,
      clientSecret: this.decryptSecret(connection.clientSecret),
    };
  }
}
