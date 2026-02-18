/**
 * Unit tests for ActivityLogService
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ActivityLogService } from './activity-log-service';
import { createMockDatabase } from '../common/mock-utils';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let dbMocks: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    dbMocks = createMockDatabase();
    service = new ActivityLogService(dbMocks.db as any);
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

      const result = await service.getGroupedLogs();

      expect(result.total).toBe(2);
      expect(result.logs).toHaveLength(2);
      expect(result.logs[0]).toMatchObject({
        path: '/pact/nodes/1/connections',
        count: 5,
        lastLevel: 'info',
        lastMessage: 'Connection accepted',
      });
      expect(result.logs[1]).toMatchObject({
        path: '/pact/nodes/2/api',
        count: 3,
        lastLevel: 'info',
        lastMessage: 'API call successful',
      });
    });

    it('should apply path filter', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs({ path: 'connections' });

      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'path',
        'like',
        '%connections%'
      );
    });

    it('should apply level filter', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs({ level: 'error' });

      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'level',
        '=',
        'error'
      );
    });

    it('should apply nodeId filter', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs({ nodeId: 42 });

      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'nodeId',
        '=',
        42
      );
    });

    it('should apply organizationId filter', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs({ organizationId: 10 });

      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'organizationId',
        '=',
        10
      );
    });

    it('should apply userId filter', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs({ userId: 7 });

      expect(dbMocks.queryChain.where).toHaveBeenCalledWith(
        'userId',
        '=',
        7
      );
    });

    it('should apply date range filters', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

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

      await service.getGroupedLogs({}, { limit: 10, offset: 20 });

      expect(dbMocks.queryChain.limit).toHaveBeenCalledWith(10);
      expect(dbMocks.queryChain.offset).toHaveBeenCalledWith(20);
    });

    it('should use default pagination values', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getGroupedLogs();

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

      const result = await service.getLogsByPath('/pact/nodes/1/connections');

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

      await service.getLogsByPath('/pact/test', { limit: 25, offset: 50 });

      expect(dbMocks.queryChain.limit).toHaveBeenCalledWith(25);
      expect(dbMocks.queryChain.offset).toHaveBeenCalledWith(50);
    });

    it('should use default pagination', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({ total: 0n });
      dbMocks.executors.execute.mockResolvedValue([]);

      await service.getLogsByPath('/pact/test');

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

      const result = await service.getNodeLogs(5);

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

      await service.getNodeLogs(10, { limit: 15, offset: 30 });

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

      const result = await service.deleteOldLogs(30);

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

      const result = await service.deleteOldLogs(90);

      expect(result).toBe(0);
    });

    it('should handle undefined numDeletedRows', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValue({});

      const result = await service.deleteOldLogs(7);

      expect(result).toBe(0);
    });
  });
});
