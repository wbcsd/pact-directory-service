import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { ListQuery } from '@src/common/list-query';

export interface ActivityLogFilters {
  path?: string;
  level?: string;
  nodeId?: number;
  organizationId?: number;
  userId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ActivityLogGrouped {
  path: string;
  count: number;
  lastCreatedAt: Date;
  lastLevel: string;
  lastMessage: string;
}

/**
 * Service for retrieving activity logs
 */
export class ActivityLogService {
  constructor(private db: Kysely<Database>) {}

  /**
   * Get grouped activity logs by path
   */
  async getGroupedLogs(
    filters: ActivityLogFilters = {},
    query: Partial<ListQuery> = {}
  ): Promise<{ logs: ActivityLogGrouped[]; total: number }> {
    let baseQuery = this.db
      .selectFrom('activity_logs')
      .select(({ fn }) => [
        'path',
        fn.count('id').as('count'),
        fn.max('createdAt').as('lastCreatedAt'),
        fn('array_agg', ['createdAt']).as('createdAtArray'),
        fn('array_agg', ['level']).as('levelArray'),
        fn('array_agg', ['message']).as('messageArray'),
      ])
      .groupBy('path');

    // Apply filters
    if (filters.path) {
      baseQuery = baseQuery.where('path', 'like', `%${filters.path}%`);
    }
    if (filters.level) {
      baseQuery = baseQuery.where('level', '=', filters.level as any);
    }
    if (filters.nodeId) {
      baseQuery = baseQuery.where('nodeId', '=', filters.nodeId);
    }
    if (filters.organizationId) {
      baseQuery = baseQuery.where('organizationId', '=', filters.organizationId);
    }
    if (filters.userId) {
      baseQuery = baseQuery.where('userId', '=', filters.userId);
    }
    if (filters.startDate) {
      baseQuery = baseQuery.where('createdAt', '>=', new Date(filters.startDate));
    }
    if (filters.endDate) {
      baseQuery = baseQuery.where('createdAt', '<=', new Date(filters.endDate));
    }

    // Get total count
    const countResult = await baseQuery
      .select(({ fn }) => fn.count('path').as('total'))
      .executeTakeFirst();
    const total = Number(countResult?.total || 0);

    // Apply pagination and sorting
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    baseQuery = baseQuery
      .orderBy('lastCreatedAt', 'desc')
      .limit(limit)
      .offset(offset);

    const results = await baseQuery.execute();

    // Transform results - get the latest entry for each path
    const logs: ActivityLogGrouped[] = results.map((row: any) => {
      // Arrays are ordered, get the last (most recent) values
      const arrays = {
        dates: row.createdAtArray as Date[],
        levels: row.levelArray as string[],
        messages: row.messageArray as string[],
      };
      
      const lastIndex = arrays.dates.length - 1;
      
      return {
        path: row.path,
        count: Number(row.count),
        lastCreatedAt: new Date(row.lastCreatedAt),
        lastLevel: arrays.levels[lastIndex],
        lastMessage: arrays.messages[lastIndex],
      };
    });

    return { logs, total };
  }

  /**
   * Get detailed logs for a specific path
   */
  async getLogsByPath(
    path: string,
    query: Partial<ListQuery> = {}
  ) {
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    const baseQuery = this.db
      .selectFrom('activity_logs')
      .selectAll()
      .where('path', '=', path);

    // Get total count
    const countResult = await this.db
      .selectFrom('activity_logs')
      .select(({ fn }) => fn.count('id').as('total'))
      .where('path', '=', path)
      .executeTakeFirst();
    const total = Number(countResult?.total || 0);

    // Apply pagination
    const logs = await baseQuery
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    return { logs, total };
  }

  /**
   * Get logs for a specific node
   */
  async getNodeLogs(nodeId: number, query: Partial<ListQuery> = {}) {
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    const baseQuery = this.db
      .selectFrom('activity_logs')
      .selectAll()
      .where('nodeId', '=', nodeId);

    // Get total count
    const countResult = await this.db
      .selectFrom('activity_logs')
      .select(({ fn }) => fn.count('id').as('total'))
      .where('nodeId', '=', nodeId)
      .executeTakeFirst();
    const total = Number(countResult?.total || 0);

    // Apply pagination
    const logs = await baseQuery
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    return { logs, total };
  }

  /**
   * Delete old logs (for cleanup/archival)
   */
  async deleteOldLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.db
      .deleteFrom('activity_logs')
      .where('createdAt', '<', cutoffDate)
      .executeTakeFirst();

    return Number(result.numDeletedRows || 0);
  }
}
