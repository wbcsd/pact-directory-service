import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@src/common/errors';
import { Policy, registerPolicy, Role } from '@src/common/policies';
import { UserContext } from './user-service';
import { NodeService } from './node-service';
import { EmailService } from './email-service';
import { ListQuery, ListResult } from '@src/common/list-query';
import { PactApiClient, FootprintFilters } from '@wbcsd/pact-api-client';
import crypto from 'crypto';
import { logNodeConnection } from '@src/common/activity-logger';

// Register policies
registerPolicy([Role.Administrator], Policy.ManageConnectionsOwnNodes);
registerPolicy([Role.Root], Policy.ManageConnectionsAllNodes);

export type CredentialsSource = 'generated' | 'external';

export interface NodeConnectionData {
  id: number;
  fromNodeId: number;
  fromNodeName?: string;
  fromNodeOrganizationId?: number;
  fromNodeOrganizationName?: string;
  targetNodeId: number;
  targetNodeName?: string;
  targetNodeOrganizationId?: number;
  targetNodeOrganizationName?: string;
  clientId: string | null;
  /** Who issued the credentials this connection authenticates with. */
  credentialsSource: CredentialsSource;
  /** True when both a client ID and a client secret are stored. The secret never leaves the server. */
  hasCredentials: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export interface ConnectionInvitationData {
  targetNodeId: number;
  message?: string;
  /** Required when the target node is external — issued by that node's operator. */
  clientId?: string;
  clientSecret?: string;
}

export interface ConnectionCredentialsData {
  clientId: string;
  clientSecret: string;
}

/** Credentials revealed once, right after they are issued by this directory. */
export interface ConnectionCredentials {
  clientId: string;
  clientSecret: string;
  connectionId: number;
  requestingNodeName?: string;
  requestingNodeType?: 'internal' | 'external';
}

export interface AcceptInvitationResult {
  connectionId: number;
  credentialsSource: CredentialsSource;
  /**
   * Directory-issued credentials, revealed once to the accepting user so they can
   * be handed to the requesting node. Absent when the credentials were issued by
   * an external operator — those belong to the requesting side, not to us.
   */
  clientId?: string;
  clientSecret?: string;
  requestingNodeName?: string;
  requestingNodeType?: 'internal' | 'external';
}

/** Non-secret view of a connection's credentials. */
export interface ConnectionCredentialsInfo {
  connectionId: number;
  clientId: string | null;
  hasClientSecret: boolean;
  credentialsSource: CredentialsSource;
}

export class NodeConnectionService {
  constructor(
    private db: Kysely<Database>,
    private nodeService: NodeService,
    private emailService: EmailService,
    private directoryApiBaseUrl: string
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
   * Shape a connection row for API callers: the stored secret is replaced by a
   * `hasCredentials` flag so it never reaches a client.
   */
  private toConnectionData<
    T extends { clientId: string | null; clientSecret: string | null },
  >(row: T): Omit<T, 'clientSecret'> & { hasCredentials: boolean } {
    const { clientSecret, ...rest } = row;
    return { ...rest, hasCredentials: !!clientSecret && !!row.clientId };
  }

  /**
   * Create an invitation (pending connection)
   */
  async createInvitation(
    context: UserContext,
    nodeId: number,
    data: ConnectionInvitationData
  ): Promise<NodeConnectionData> {
    // Validate input
    if (!data.targetNodeId) {
      throw new BadRequestError('Target node ID is required');
    }

    if (nodeId === data.targetNodeId) {
      throw new BadRequestError('Cannot create connection to the same node');
    }

    // Get both nodes and check access
    const fromNode = await this.nodeService.get(context, nodeId);
    // Use getById for the target — access control on the target is handled below
    const targetNode = await this.nodeService.getById(data.targetNodeId);

    // Cross-org targets must be discoverable
    if (
      targetNode.organizationId !== context.organizationId &&
      !targetNode.discoverable
    ) {
      throw new ForbiddenError('The target node is not discoverable');
    }

    // Check if user has permission to create connections from this node
    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === fromNode.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to create connections from this node');
    }

    const existingConnection = await this.db
      .selectFrom('connections')
      .selectAll()
      .where((eb) =>
        eb.and([
          eb.and([
            eb('fromNodeId', '=', nodeId),
            eb('targetNodeId', '=', data.targetNodeId),
          ]),
          eb('status', 'in', ['pending', 'accepted']),
        ])
      )
      .executeTakeFirst();

    if (existingConnection) {
      throw new BadRequestError('A connection between these nodes already exists');
    }

    // Remove any previously rejected connections for this pair so the unique constraint allows re-invitation
    await this.db
      .deleteFrom('connections')
      .where((eb) =>
        eb.and([
          eb.or([
            eb.and([
              eb('fromNodeId', '=', nodeId),
              eb('targetNodeId', '=', data.targetNodeId),
            ]),
            eb.and([
              eb('fromNodeId', '=', data.targetNodeId),
              eb('targetNodeId', '=', nodeId),
            ]),
          ]),
          eb('status', '=', 'rejected'),
        ])
      )
      .execute();

    // Credentials authenticate the from node against the target node.
    // For an internal target this directory issues them; for an external target
    // they were issued out-of-band by that node's operator and must be supplied.
    const isExternalTarget = targetNode.type === 'external';
    const credentials = isExternalTarget
      ? {
          clientId: data.clientId?.trim() ?? '',
          clientSecret: data.clientSecret?.trim() ?? '',
        }
      : this.generateCredentials();

    if (isExternalTarget && (!credentials.clientId || !credentials.clientSecret)) {
      throw new BadRequestError(
        'A client ID and client secret issued by the external node are required to connect to it'
      );
    }

    // Create the connection with pending status
    const connection = await this.db
      .insertInto('connections')
      .values({
        fromNodeId: nodeId,
        targetNodeId: data.targetNodeId,
        clientId: credentials.clientId,
        clientSecret: this.encryptSecret(credentials.clientSecret),
        credentialsSource: isExternalTarget ? 'external' : 'generated',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Send email notification to target node's organization admins
    const targetOrgAdmins = await this.db
      .selectFrom('users')
      .select(['users.email', 'users.fullName'])
      .where('users.organizationId', '=', targetNode.organizationId)
      .where('users.role', '=', Role.Administrator)
      .where('users.status', '=', 'enabled')
      .execute();

    for (const admin of targetOrgAdmins) {
      await this.emailService.sendConnectionRequestEmail({
        to: admin.email,
        name: admin.fullName,
        organizationName: fromNode.organizationName || 'Unknown Organization',
      });
    }

    // Log the connection invitation
    logNodeConnection(
      nodeId,
      data.targetNodeId,
      'invitation_sent',
      {
        connectionId: connection.id,
        fromNodeName: fromNode.name,
        targetNodeName: targetNode.name,
        organizationId: fromNode.organizationId,
        userId: context.userId,
        message: data.message,
      }
    );

    return this.toConnectionData(connection) as NodeConnectionData;
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
      .leftJoin('nodes as fromNode', 'fromNode.id', 'connections.fromNodeId')
      .leftJoin('nodes as targetNode', 'targetNode.id', 'connections.targetNodeId')
      .select([
        'connections.id',
        'connections.fromNodeId',
        'fromNode.name as fromNodeName',
        'connections.targetNodeId',
        'targetNode.name as targetNodeName',
        'connections.clientId',
        'connections.clientSecret',
        'connections.credentialsSource',
        'connections.status',
        'connections.createdAt',
        'connections.updatedAt',
        'connections.expiresAt',
      ])
      .where('targetNodeId', '=', nodeId)
      .where('connections.status', '=', 'pending');

    // Get total count
    const total = (
      await this.db
        .selectFrom('connections')
        .select((eb) => eb.fn.count('id').as('total'))
        .where('targetNodeId', '=', nodeId)
        .where('status', '=', 'pending')
        .executeTakeFirstOrThrow()
    ).total as number;

    // Apply sorting
    qb = qb.orderBy('createdAt', query.sortOrder || 'desc');

    // Apply pagination
    const data = await qb.offset(query.offset).limit(query.limit).execute();

    return {
      data: data.map((row) => this.toConnectionData(row)) as NodeConnectionData[],
      pagination: query.pagination(total),
    };
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(
    context: UserContext,
    invitationId: number
  ): Promise<AcceptInvitationResult> {
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

    // Get the from node for logging (use getById — from node may belong to another org)
    const fromNode = await this.nodeService.getById(invitation.fromNodeId);

    // Log the accepted invitation
    logNodeConnection(
      invitation.targetNodeId,
      invitation.fromNodeId,
      'invitation_accepted',
      {
        connectionId: invitation.id,
        fromNodeName: fromNode.name,
        targetNodeName: targetNode.name,
        organizationId: targetNode.organizationId,
        userId: context.userId,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }
    );

    // Notify the from node's org admins that their invitation was accepted
    const fromOrgAdmins = await this.db
      .selectFrom('users')
      .select(['users.email', 'users.fullName'])
      .where('users.organizationId', '=', fromNode.organizationId)
      .where('users.role', '=', Role.Administrator)
      .where('users.status', '=', 'enabled')
      .execute();

    for (const admin of fromOrgAdmins) {
      await this.emailService.sendConnectionAcceptedEmail({
        to: admin.email,
        name: admin.fullName,
        fromNodeName: fromNode.name,
        fromOrganizationName: fromNode.organizationName || 'Unknown Organization',
      });
    }

    // Reveal the credentials only when this directory issued them. Credentials
    // supplied by the requesting side (external target) are not ours to disclose.
    if (invitation.credentialsSource !== 'generated') {
      return {
        connectionId: invitation.id,
        credentialsSource: invitation.credentialsSource,
        requestingNodeName: fromNode.name,
        requestingNodeType: fromNode.type,
      };
    }

    return {
      connectionId: invitation.id,
      credentialsSource: 'generated',
      clientId: invitation.clientId ?? undefined,
      clientSecret: invitation.clientSecret
        ? this.decryptSecret(invitation.clientSecret)
        : undefined,
      requestingNodeName: fromNode.name,
      requestingNodeType: fromNode.type,
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

    // Get the from node for logging (use getById to avoid cross-org 403)
    const fromNode = await this.nodeService.getById(invitation.fromNodeId);

    // Log the rejected invitation
    logNodeConnection(
      invitation.targetNodeId,
      invitation.fromNodeId,
      'invitation_rejected',
      {
        connectionId: invitation.id,
        fromNodeName: fromNode.name,
        targetNodeName: targetNode.name,
        organizationId: targetNode.organizationId,
        userId: context.userId,
      }
    );
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
      .leftJoin('nodes as fromNode', 'fromNode.id', 'connections.fromNodeId')
      .leftJoin('nodes as targetNode', 'targetNode.id', 'connections.targetNodeId')
      .leftJoin('organizations as fromOrg', 'fromOrg.id', 'fromNode.organizationId')
      .leftJoin('organizations as targetOrg', 'targetOrg.id', 'targetNode.organizationId')
      .select([
        'connections.id',
        'connections.fromNodeId',
        'fromNode.name as fromNodeName',
        'fromNode.organizationId as fromNodeOrganizationId',
        'fromOrg.name as fromNodeOrganizationName',
        'connections.targetNodeId',
        'targetNode.name as targetNodeName',
        'targetNode.organizationId as targetNodeOrganizationId',
        'targetOrg.name as targetNodeOrganizationName',
        'connections.clientId',
        'connections.clientSecret',
        'connections.credentialsSource',
        'connections.status',
        'connections.createdAt',
        'connections.updatedAt',
        'connections.expiresAt',
      ])
      .where((eb) =>
        eb.or([eb('connections.fromNodeId', '=', nodeId), eb('connections.targetNodeId', '=', nodeId)])
      )
      .where('connections.status', 'in', ['accepted', 'pending']);

    // Get total count
    const total = (
      await this.db
        .selectFrom('connections')
        .select((eb) => eb.fn.count('id').as('total'))
        .where((eb) =>
          eb.or([eb('fromNodeId', '=', nodeId), eb('targetNodeId', '=', nodeId)])
        )
        .where('status', 'in', ['accepted', 'pending'])
        .executeTakeFirstOrThrow()
    ).total as number;

    // Apply sorting
    qb = qb.orderBy('createdAt', query.sortOrder || 'desc');

    // Apply pagination
    const data = await qb.offset(query.offset).limit(query.limit).execute();

    return {
      data: data.map((row) => this.toConnectionData(row)) as NodeConnectionData[],
      pagination: query.pagination(total),
    };
  }

  /**
   * Remove a connection
   */
  async removeConnection(context: UserContext, connectionId: number): Promise<{ success: boolean; removedId: number }> {
    // Get the connection
    const connection = await this.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', connectionId)
      .executeTakeFirst();

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Get both nodes to check access (use getById to avoid cross-org 403)
    const fromNode = await this.nodeService.getById(connection.fromNodeId);
    const targetNode = await this.nodeService.getById(connection.targetNodeId);

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
      .deleteFrom('connections')
      .where('id', '=', connectionId)
      .execute();

    // Log the connection removal
    logNodeConnection(
      connection.fromNodeId,
      connection.targetNodeId,
      'connection_removed',
      {
        connectionId,
        fromNodeName: fromNode.name,
        targetNodeName: targetNode.name,
        organizationId: hasAccessToFrom ? fromNode.organizationId : targetNode.organizationId,
        userId: context.userId,
      }
    );

    return {
      success: true,
      removedId: connectionId,
    }
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

    // Credentials issued by an external operator can only be replaced by that
    // operator; the directory has nothing to rotate.
    if (connection.credentialsSource !== 'generated') {
      throw new BadRequestError(
        'These credentials were issued by the external node’s operator. Request new credentials from them and update the connection instead.'
      );
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
   * Replace the credentials a connection authenticates with. Only applies to
   * credentials issued by an external node's operator — directory-issued
   * credentials are managed through rotateCredentials().
   */
  async updateCredentials(
    context: UserContext,
    connectionId: number,
    data: Partial<ConnectionCredentialsData>
  ): Promise<ConnectionCredentialsInfo> {
    const connection = await this.db
      .selectFrom('connections')
      .selectAll()
      .where('id', '=', connectionId)
      .executeTakeFirst();

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Only the initiating side holds these credentials, so access is checked
    // against the from node.
    const fromNode = await this.nodeService.get(context, connection.fromNodeId);

    const allowed =
      context.policies.includes('manage-connections-all-nodes') ||
      (context.policies.includes('manage-connections-own-nodes') &&
        context.organizationId === fromNode.organizationId);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to update credentials for this connection');
    }

    if (connection.credentialsSource !== 'external') {
      throw new BadRequestError(
        'This connection uses credentials issued by the directory. Rotate them instead.'
      );
    }

    const clientId = data.clientId?.trim();
    const clientSecret = data.clientSecret?.trim();

    if (!clientId) {
      throw new BadRequestError('Client ID is required');
    }

    // An empty secret keeps the stored one, so credentials can be re-entered
    // without retyping the secret.
    if (!clientSecret && !connection.clientSecret) {
      throw new BadRequestError('Client secret is required');
    }

    const updated = await this.db
      .updateTable('connections')
      .set({
        clientId,
        ...(clientSecret ? { clientSecret: this.encryptSecret(clientSecret) } : {}),
        updatedAt: new Date(),
      })
      .where('id', '=', connectionId)
      .returningAll()
      .executeTakeFirstOrThrow();

    logNodeConnection(
      connection.fromNodeId,
      connection.targetNodeId,
      'credentials_updated',
      {
        connectionId,
        fromNodeName: fromNode.name,
        organizationId: fromNode.organizationId,
        userId: context.userId,
      }
    );

    return {
      connectionId,
      clientId: updated.clientId,
      hasClientSecret: !!updated.clientSecret,
      credentialsSource: updated.credentialsSource,
    };
  }

  /**
   * Get the non-secret view of a connection's credentials
   */
  async getCredentials(
    context: UserContext,
    connectionId: number
  ): Promise<ConnectionCredentialsInfo> {
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
      hasClientSecret: !!connection.clientSecret,
      credentialsSource: connection.credentialsSource,
    };
  }

  /**
   * Verify client credentials for a target node (no access control, for machine-to-machine auth)
   * Returns connection info if credentials are valid, null otherwise.
   */
  async verifyConnectionCredentials(
    targetNodeId: number,
    clientId: string,
    clientSecret: string
  ): Promise<{ id: number; fromNodeId: number; fromNodeOrganizationId: number; status: string } | null> {
    const connection = await this.db
      .selectFrom('connections')
      .innerJoin('nodes as fromNode', 'connections.fromNodeId', 'fromNode.id')
      .innerJoin('organizations as fromOrg', 'fromNode.organizationId', 'fromOrg.id')
      .select([
        'connections.id',
        'connections.fromNodeId',
        'connections.status',
        'connections.clientId',
        'connections.clientSecret',
        'fromOrg.id as fromNodeOrganizationId',
      ])
      .where('connections.targetNodeId', '=', targetNodeId)
      .where('connections.clientId', '=', clientId)
      .where('connections.status', '=', 'accepted')
      // Only credentials this directory issued can authenticate an inbound call;
      // credentials held for an external target are used outbound only.
      .where('connections.credentialsSource', '=', 'generated')
      .executeTakeFirst();

    if (!connection) {
      return null;
    }

    // TODO: Use crypto.timingSafeEqual for constant-time comparison
    if (process.env.NODE_ENV !== 'development') {
      if (!connection.clientSecret || this.decryptSecret(connection.clientSecret) !== clientSecret) {
        return null;
      }
    }

    return {
      id: connection.id,
      fromNodeId: connection.fromNodeId,
      fromNodeOrganizationId: connection.fromNodeOrganizationId,
      status: connection.status,
    };
  }

  /**
   * Request footprints from a connected node
   * 
   * This is an example integration showing how to use the unified PACT client
   * to communicate with both internal and external nodes using the same code.
   * 
   * @param context - User context for authorization
   * @param connectionId - ID of the connection to use
   * @param filters - Optional filters for footprint query
   * @returns Array of product footprints from the target node
   */
  async requestFootprints(
    context: UserContext,
    connectionId: number,
    filters?: FootprintFilters
  ) {
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
      throw new ForbiddenError('You are not allowed to use this connection');
    }

    // Get target node
    const targetNode = await this.db
      .selectFrom('nodes')
      .select(['id', 'type', 'apiUrl', 'authBaseUrl', 'scope', 'audience', 'resource'])
      .where('id', '=', connection.targetNodeId)
      .executeTakeFirstOrThrow();

    // Create client with credentials — authentication happens automatically
    const baseUrl = targetNode.apiUrl
      ? targetNode.apiUrl.replace(/\/$/, '')
      : `${this.directoryApiBaseUrl}/api/nodes/${targetNode.id}`;

    const source = `${this.directoryApiBaseUrl}/api/nodes/${connection.fromNodeId}`;

    // The connection carries the credentials the from node authenticates with,
    // whether this directory issued them or the external operator did.
    if (!connection.clientId || !connection.clientSecret) {
      throw new BadRequestError('No credentials are configured for this connection');
    }

    const client = new PactApiClient(
      baseUrl,
      connection.clientId,
      this.decryptSecret(connection.clientSecret),
      source,
      {
        authBaseUrl: targetNode.authBaseUrl ?? undefined,
        scope: targetNode.scope ?? undefined,
        audience: targetNode.audience ?? undefined,
        resource: targetNode.resource ?? undefined,
      }
    );

    // Fetch footprints - same code for internal and external!
    const result = await client.listFootprints(filters, { limit: 10, offset: 0 });

    // Log the footprint request
    logNodeConnection(
      connection.fromNodeId,
      connection.targetNodeId,
      'footprints_requested',
      {
        connectionId,
        fromNodeName: fromNode.name,
        targetNodeType: targetNode.type,
        resultCount: result.data.length,
        filters,
        organizationId: fromNode.organizationId,
        userId: context.userId,
      }
    );

    return result.data;
  }
}
