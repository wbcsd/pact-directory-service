/**
 * Unit tests for ActivityLogService
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ActivityLogService } from './activity-log-service';
import { createMockDatabase } from '../common/mock-utils';
import { UserContext } from './user-service';
import { Role } from '@src/common/policies';
import { ListQuery } from '@src/common/list-query';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let rootContext: UserContext;
  let adminContext: UserContext;
  let userContext: UserContext;

  beforeEach(() => {
    jest.clearAllMocks();
    dbMocks = createMockDatabase();
    service = new ActivityLogService(dbMocks.db as any);

    // Root user with view-all-logs policy
    rootContext = {
      userId: 1,
      email: 'root@example.com',
      organizationId: 1,
      role: Role.Root,
      policies: ['view-all-logs'],
      status: 'active' as any,
    };

    // Admin user with view-org-logs policy
    adminContext = {
      userId: 2,
      email: 'admin@example.com',
      organizationId: 1,
      role: Role.Administrator,
      policies: ['view-org-logs'],
      status: 'active' as any,
    };

    // Regular user with view-org-logs policy
    userContext = {
      userId: 3,
      email: 'user@example.com',
      organizationId: 2,
      role: Role.User,
      policies: ['view-org-logs'],
      status: 'active' as any,
    };
  });

  describe('getGroupedLogs', () => {
    it('should return grouped logs by path with counts', async () => {
      const mockGroupedData = [
        {
          path: '/pact/nodes/1/connections',
          count: 5n,
          lastCreatedAt: new Date('2024-01-15T10:00:00Z'),
          createdAtArray: [
            new Date('2024-01-15T09:00:00Z'),
            new Date('2024-01-15T10:00:00Z'),
          ],
          levelArray: ['info', 'info'],
          messageArray: ['Connection created', 'Connection accepted'],
        },
        {
          path: '/pact/nodes/2/api',
          count: 3n,
          lastCreatedAt: new Date('2024-01-15T11:00:00Z'),
          createdAtArray: [
            new Date('2024-01-15T11:00:00Z'),
          ],
          levelArray: ['info'],
          messageArray: ['API call successful'],
        },
      ];

      // First call for count
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({ total: 2n });
      // Second call for actual data
      dbMocks.executors.execute.mockResolvedValue(mockGroupedData);

      const result = await service.getGroupedLogs(rootContext, {}, new ListQuery({ page: 1, pageSize: 50 }));

      expect(result.pagination.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({
        path: '/pact/nodes/1/connections',
        count: 5,
        lastLevel: 'info',
        lastMessage: 'Connection accepted',
      });
      expect(result.data[1]).toMatchObject({
        path: '/pact/nodes/2/api',
        count: 3,
        lastLevel: 'info',
        lastMessage: 'API call successful',
      });
    });

    it('should apply path filter', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs(rootContext, { path: 'connections' }, new ListQuery({ page: 1, pageSize: 50 }));

      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'path',
        'like',
        '%connections%'
      );
    });

    it('should apply level filter', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs(rootContext, { level: 'error' }, new ListQuery({ page: 1, pageSize: 50 }));

      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'level',
        '=',
        'error'
      );
    });

    it('should apply nodeId filter', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs(rootContext, { nodeId: 42 }, new ListQuery({ page: 1, pageSize: 50 }));

      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'nodeId',
        '=',
        42
      );
    });

    it('should apply organizationId filter', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs(rootContext, { organizationId: 10 }, new ListQuery({ page: 1, pageSize: 50 }));

      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'organizationId',
        '=',
        10
      );
    });

    it('should apply userId filter', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs(rootContext, { userId: 7 }, new ListQuery({ page: 1, pageSize: 50 }));

      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'userId',
        '=',
        7
      );
    });

    it('should apply date range filters', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs(rootContext, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      }, new ListQuery({ page: 1, pageSize: 50 }));

      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'createdAt',
        '>=',
        new Date('2024-01-01')
      );
      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'createdAt',
        '<=',
        new Date('2024-01-31')
      );
    });

    it('should apply pagination with custom limit and offset', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs(rootContext, {}, new ListQuery({ page: 3, pageSize: 10 }));

      expect(dbMocks.queryChain.limit).toHaveBeenCalledWith(10);
      expect(dbMocks.queryChain.offset).toHaveBeenCalledWith(20);
    });

    it('should use default pagination values', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs(rootContext, {}, new ListQuery({ page: 1, pageSize: 50 }));

      expect(dbMocks.queryChain.limit).toHaveBeenCalledWith(50);
      expect(dbMocks.queryChain.offset).toHaveBeenCalledWith(0);
    });
  });

  describe('getLogsByPath', () => {
    it('should return logs for specific path with pagination', async () => {
      const mockLogs = [
        {
          id: 1,
          path: '/pact/nodes/1/connections',
          level: 'info',
          message: 'Connection created',
          content: { action: 'create' },
          nodeId: 1,
          organizationId: null,
          userId: null,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 2,
          path: '/pact/nodes/1/connections',
          level: 'info',
          message: 'Connection accepted',
          content: { action: 'accept' },
          nodeId: 1,
          organizationId: null,
          userId: null,
          createdAt: new Date('2024-01-15T11:00:00Z'),
        },
      ];

      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 2n });
      dbMocks.executors.execute.mockResolvedValue(mockLogs);

      const result = await service.getLogsByPath(rootContext, '/pact/nodes/1/connections');

      expect(result.total).toBe(2);
      expect(result.logs).toHaveLength(2);
      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'path',
        '=',
        '/pact/nodes/1/connections'
      );
      expect(dbMocks.queryChain.orderBy).toHaveBeenCalledWith(
        'createdAt',
        'desc'
      );
    });

    it('should apply custom pagination', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getLogsByPath(rootContext, '/pact/test', { limit: 25, offset: 50 });

      expect(dbMocks.queryChain.limit).toHaveBeenCalledWith(25);
      expect(dbMocks.queryChain.offset).toHaveBeenCalledWith(50);
    });

    it('should use default pagination', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getLogsByPath(rootContext, '/pact/test');

      expect(dbMocks.queryChain.limit).toHaveBeenCalledWith(100);
      expect(dbMocks.queryChain.offset).toHaveBeenCalledWith(0);
    });
  });

  describe('getNodeLogs', () => {
    it('should return logs for specific node', async () => {
      const mockLogs = [
        {
          id: 1,
          path: '/pact/nodes/5/connections',
          level: 'info',
          message: 'Connection created',
          content: {},
          nodeId: 5,
          organizationId: null,
          userId: null,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 2,
          path: '/pact/nodes/5/api',
          level: 'error',
          message: 'API call failed',
          content: { error: 'timeout' },
          nodeId: 5,
          organizationId: null,
          userId: null,
          createdAt: new Date('2024-01-15T11:00:00Z'),
        },
      ];

      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 2n });
      dbMocks.executors.execute.mockResolvedValue(mockLogs);

      const result = await service.getNodeLogs(rootContext, 5);

      expect(result.total).toBe(2);
      expect(result.logs).toHaveLength(2);
      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'nodeId',
        '=',
        5
      );
      expect(dbMocks.queryChain.orderBy).toHaveBeenCalledWith(
        'createdAt',
        'desc'
      );
    });

    it('should apply custom pagination', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getNodeLogs(rootContext, 10, { limit: 15, offset: 30 });

      expect(dbMocks.queryChain.limit).toHaveBeenCalledWith(15);
      expect(dbMocks.queryChain.offset).toHaveBeenCalledWith(30);
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete logs older than specified days', async () => {
      const mockExecuteResult = {
        numDeletedRows: 42n,
      };

      dbMocks.executors.executeTakeFirst.mockResolvedValue(mockExecuteResult);

      const result = await service.deleteOldLogs(rootContext, 30);

      expect(result).toBe(42);
      expect(dbMocks.db.deleteFrom).toHaveBeenCalledWith('activity_logs');
      
      // Verify the date calculation (should be ~30 days ago)
      const whereCall = (dbMocks.queryChain.where as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'createdAt'
      );
      expect(whereCall).toBeDefined();
      expect(whereCall[1]).toBe('<');
      
      const cutoffDate = whereCall[2] as Date;
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(31);
    });

    it('should return 0 when no logs are deleted', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({
        numDeletedRows: 0n,
      });

      const result = await service.deleteOldLogs(rootContext, 90);

      expect(result).toBe(0);
    });

    it('should handle undefined numDeletedRows', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({});

      const result = await service.deleteOldLogs(rootContext, 7);

      expect(result).toBe(0);
    });
  });
});
