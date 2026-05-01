/**
 * Activity Logger
 * 
 * Specialized logger for tracking node operations, API calls, and connections.
 * Uses Pino for logging interface, writes to both stdout and PostgreSQL database.
 * 
 * CloudWatch-style paths:
 * - /pact/nodes/{nodeId}/connections - Connection operations
 * - /pact/nodes/{nodeId}/api - API calls
 * - /pact/nodes/{nodeId}/auth - Authentication operations
 * - /pact/testing/{testRunId} - Conformance testing
 * - /pact/organizations/{orgId} - Organization operations
 */

import pino from 'pino';
import { db } from '@src/database/db';
import config from './config';

/**
 * Activity log metadata
 */
export interface ActivityLogMeta {
  path: string; // CloudWatch-style path
  nodeId?: number;
  organizationId?: number;
  userId?: number;
  content?: Record<string, any>;
  [key: string]: any; // Additional metadata
}

/**
 * Create Pino logger for activity logs
 */
const activityLogger = pino({
  level: 'debug',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

/**
 * Write log to database asynchronously
 */
async function writeToDatabase(
  level: string,
  message: string,
  meta: ActivityLogMeta
) {
  try {
    const { path, nodeId, organizationId, userId, content, ...otherMeta } = meta;
    
    await db
      .insertInto('activity_logs')
      .values({
        path,
        level: level as 'debug' | 'info' | 'warn' | 'error',
        message,
        content: content || otherMeta,
        nodeId: nodeId || null,
        organizationId: organizationId || null,
        userId: userId || null,
        createdAt: new Date(),
      })
      .execute();
  } catch (error) {
    // Log to stderr but don't crash the app
    console.error('Failed to write activity log to database:', error);
  }
}

/**
 * Log activity with structured path and metadata
 */
export function logActivity(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  meta: ActivityLogMeta
) {
  // Log to Pino (stdout)
  activityLogger[level](meta, message);
  
  // Write to database asynchronously (fire and forget)
  if (config.NODE_ENV !== 'test') {
    writeToDatabase(level, message, meta).catch((err) => {
      console.error('Activity log database write failed:', err);
    });
  }
}

/**
 * Helper functions for common log patterns
 */

export function logNodeConnection(
  nodeId: number,
  targetNodeId: number,
  action: string,
  meta: Record<string, any> = {}
) {
  logActivity('info', `Node connection ${action}`, {
    path: `/pact/nodes/${nodeId}/connections`,
    nodeId,
    targetNodeId,
    action,
    ...meta,
  });
}

export function logNodeApiCall(
  nodeId: number,
  endpoint: string,
  method: string,
  statusCode: number,
  meta: Record<string, any> = {}
) {
  const level = statusCode >= 400 ? 'error' : 'info';
  logActivity(level, `API call ${method} ${endpoint}`, {
    path: `/pact/nodes/${nodeId}/api`,
    nodeId,
    endpoint,
    method,
    statusCode,
    ...meta,
  });
}

export function logNodeAuth(
  nodeId: number,
  action: string,
  success: boolean,
  meta: Record<string, any> = {}
) {
  const level = success ? 'info' : 'warn';
  logActivity(level, `Authentication ${action}`, {
    path: `/pact/nodes/${nodeId}/auth`,
    nodeId,
    action,
    success,
    ...meta,
  });
}

export function logConformanceTest(
  testRunId: string,
  status: string,
  meta: Record<string, any> = {}
) {
  logActivity('info', `Conformance test ${status}`, {
    path: `/pact/testing/${testRunId}`,
    testRunId,
    status,
    ...meta,
  });
}

export function logOrganization(
  organizationId: number,
  action: string,
  meta: Record<string, any> = {}
) {
  logActivity('info', `Organization ${action}`, {
    path: `/pact/organizations/${organizationId}`,
    organizationId,
    action,
    ...meta,
  });
}

export function logError(
  path: string,
  error: Error,
  meta: Record<string, any> = {}
) {
  logActivity('error', error.message, {
    path,
    content: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...meta,
  });
}
