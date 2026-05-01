import { Kysely } from 'kysely';
import { Database } from '@src/database/types';
import { ListQuery, ListResult } from '@src/common/list-query';
import { UserContext } from './user-service';
import { hasAccess, Role, registerPolicy } from '@src/common/policies';

// Register activity log policies
registerPolicy([Role.Root], 'view-all-logs');
registerPolicy([Role.Administrator, Role.User], 'view-org-logs');

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
    context: UserContext,
    filters: ActivityLogFilters = {},
    query: ListQuery
  ): Promise<ListResult<ActivityLogGrouped>> {
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

    // Apply organization filter based on user's policy
    // Root users with 'view-all-logs' can see all logs
    // Other users with 'view-org-logs' can only see their organization's logs
    if (!hasAccess(context, 'view-all-logs')) {
      baseQuery = baseQuery.where('organizationId', '=', context.organizationId);
    }

    // Apply search filter (searches in path)
    if (query.search) {
      baseQuery = baseQuery.where('path', 'like', `%${query.search}%`);
    }

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
    const pageSize = query.pageSize || 50;
    const page = query.page || 1;
    const offset = (page - 1) * pageSize;

    baseQuery = baseQuery
      .orderBy('lastCreatedAt', 'desc')
      .limit(pageSize)
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

    return {
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Get detailed logs for a specific path
   */
  async getLogsByPath(
    context: UserContext,
    path: string,
    query: Partial<ListQuery> = {}
  ) {
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    let baseQuery = this.db
      .selectFrom('activity_logs')
      .selectAll()
      .where('path', '=', path);

    // Apply organization filter based on user's policy
    if (!hasAccess(context, 'view-all-logs')) {
      baseQuery = baseQuery.where('organizationId', '=', context.organizationId);
    }

    // Get total count
    let countQuery = this.db
      .selectFrom('activity_logs')
      .select(({ fn }) => fn.count('id').as('total'))
      .where('path', '=', path);

    if (!hasAccess(context, 'view-all-logs')) {
      countQuery = countQuery.where('organizationId', '=', context.organizationId);
    }

    const countResult = await countQuery.executeTakeFirst();
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
  async getNodeLogs(context: UserContext, nodeId: number, query: Partial<ListQuery> = {}) {
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    let baseQuery = this.db
      .selectFrom('activity_logs')
      .selectAll()
      .where('nodeId', '=', nodeId);

    // Apply organization filter based on user's policy
    if (!hasAccess(context, 'view-all-logs')) {
      baseQuery = baseQuery.where('organizationId', '=', context.organizationId);
    }

    // Get total count
    let countQuery = this.db
      .selectFrom('activity_logs')
      .select(({ fn }) => fn.count('id').as('total'))
      .where('nodeId', '=', nodeId);

    if (!hasAccess(context, 'view-all-logs')) {
      countQuery = countQuery.where('organizationId', '=', context.organizationId);
    }

    const countResult = await countQuery.executeTakeFirst();
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
   * Only users with 'view-all-logs' policy (Root) can delete logs
   */
  async deleteOldLogs(context: UserContext, olderThanDays: number): Promise<number> {
    // Only allow deletion if user has view-all policy
    if (!hasAccess(context, 'view-all-logs')) {
      return 0; // Silently fail for non-root users
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.db
      .deleteFrom('activity_logs')
      .where('createdAt', '<', cutoffDate)
      .executeTakeFirst();

    return Number(result.numDeletedRows || 0);
  }
}
