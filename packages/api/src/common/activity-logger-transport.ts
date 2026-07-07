/**
 * Pino Transport for PostgreSQL
 * 
 * This transport writes Pino logs to the activity_logs table.
 * It runs in a separate worker thread as per Pino's transport architecture.
 */

import build from 'pino-abstract-transport';
import { Pool } from 'pg';
import config from './config';

export default async function () {
  const pool = new Pool({
    connectionString: config.DB_CONNECTION_STRING,
    max: 5, // Limit connections for transport
  });

  return build(async function (source) {
    for await (const obj of source) {
      try {
        // Map Pino log levels to our levels
        const levelMap: Record<number, string> = {
          10: 'debug', // trace
          20: 'debug',
          30: 'info',
          40: 'warn',
          50: 'error',
          60: 'error', // fatal
        };

        const level = levelMap[obj.level] || 'info';

        // Only log if path is present (activity logs)
        if (!obj.path) {
          continue;
        }

        // Extract fields we want to store separately
        const { path, nodeId, organizationId, userId, content, msg } = obj;
        
        // Get other metadata (excluding Pino internals)
        const pinoInternals = ['level', 'time', 'pid', 'hostname', 'msg', 'path', 'nodeId', 'organizationId', 'userId', 'content'];
        const otherMeta = Object.keys(obj)
          .filter(key => !pinoInternals.includes(key))
          .reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {});

        // Merge content with other metadata
        const finalContent = content || otherMeta;

        // Insert into database
        await pool.query(
          `INSERT INTO activity_logs (path, level, message, content, node_id, organization_id, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            path,
            level,
            msg || '',
            JSON.stringify(finalContent),
            nodeId || null,
            organizationId || null,
            userId || null,
          ]
        );
      } catch (error) {
        // Log to stderr but don't throw - we don't want logging failures to crash the app
        console.error('Failed to write activity log to database:', error);
      }
    }
  });
}
