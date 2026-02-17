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
        // Extract metadata from Pino log object
        const {
          level: pinoLevel,
          msg,
          path,
          nodeId,
          organizationId,
          userId,
          ...content
        } = obj;

        // Map Pino log levels to our levels
        const levelMap: Record<number, string> = {
          10: 'debug', // trace
          20: 'debug',
          30: 'info',
          40: 'warn',
          50: 'error',
          60: 'error', // fatal
        };

        const level = levelMap[pinoLevel] || 'info';

        // Only log if path is present (activity logs)
        if (!path) {
          continue;
        }

        // Insert into database
        await pool.query(
          `INSERT INTO activity_logs (path, level, message, content, node_id, organization_id, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            path,
            level,
            msg || '',
            JSON.stringify(content),
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
