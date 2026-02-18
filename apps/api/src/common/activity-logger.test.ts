/**
 * Unit tests for activity-logger.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as activityLogger from './activity-logger';
import { db } from '@src/database/db';

// Mock the database
jest.mock('@src/database/db', () => ({
  db: {
    insertInto: jest.fn(),
  },
}));

describe('activity-logger', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('logActivity', () => {
    it('should write activity log to database with all fields', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      activityLogger.logActivity('info', 'Test message', {
        path: '/pact/test',
        nodeId: 1,
        organizationId: 2,
        userId: 3,
        content: { key: 'value' },
      });

      // Give async operation time to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockInsertInto).toHaveBeenCalledWith('activity_logs');
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/pact/test',
          level: 'info',
          message: 'Test message',
          content: { key: 'value' },
          nodeId: 1,
          organizationId: 2,
          userId: 3,
          createdAt: expect.any(Date),
        })
      );
    });

    it('should handle null optional fields', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      activityLogger.logActivity('warn', 'Warning message', {
        path: '/pact/warning',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeId: null,
          organizationId: null,
          userId: null,
        })
      );
    });

    it('should merge other metadata into content field', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      activityLogger.logActivity('debug', 'Debug message', {
        path: '/pact/debug',
        customField1: 'value1',
        customField2: 123,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          content: {
            customField1: 'value1',
            customField2: 123,
          },
        })
      );
    });

    it('should log error to console on database failure', async () => {
      const mockExecute = jest.fn().mockRejectedValue(new Error('DB Error'));
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      activityLogger.logActivity('error', 'Error message', {
        path: '/pact/error',
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to write activity log:',
        expect.any(Error)
      );
    });
  });

  describe('logNodeConnection', () => {
    it('should log node connection with correct path and metadata', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      activityLogger.logNodeConnection(
        1,
        2,
        'invitation_sent',
        {
          connectionId: 100,
          fromNodeName: 'Node A',
          targetNodeName: 'Node B',
        }
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/pact/nodes/1/connections',
          level: 'info',
          message: 'Node connection invitation_sent',
          content: expect.objectContaining({
            targetNodeId: 2,
            action: 'invitation_sent',
            connectionId: 100,
            fromNodeName: 'Node A',
            targetNodeName: 'Node B',
          }),
          nodeId: 1,
        })
      );
    });
  });

  describe('logNodeApiCall', () => {
    it('should log successful API call with info level', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      activityLogger.logNodeApiCall(
        1,
        '/2/footprints',
        'GET',
        200,
        { duration: 123 }
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/pact/nodes/1/api',
          level: 'info',
          message: 'API call GET /2/footprints',
          content: expect.objectContaining({
            endpoint: '/2/footprints',
            method: 'GET',
            statusCode: 200,
            duration: 123,
          }),
        })
      );
    });

    it('should log failed API call with error level', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      activityLogger.logNodeApiCall(
        1,
        '/2/footprints/123',
        'GET',
        404,
        { error: 'Not found' }
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          content: expect.objectContaining({
            statusCode: 404,
            error: 'Not found',
          }),
        })
      );
    });
  });

  describe('logNodeAuth', () => {
    it('should log successful authentication with info level', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      activityLogger.logNodeAuth(
        1,
        'token_generated',
        true,
        { clientId: 'client-123' }
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/pact/nodes/1/auth',
          level: 'info',
          message: 'Authentication token_generated',
          content: expect.objectContaining({
            action: 'token_generated',
            success: true,
            clientId: 'client-123',
          }),
        })
      );
    });

    it('should log failed authentication with warn level', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      activityLogger.logNodeAuth(
        1,
        'token_rejected',
        false,
        { error: 'Invalid credentials' }
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          content: expect.objectContaining({
            success: false,
            error: 'Invalid credentials',
          }),
        })
      );
    });
  });

  describe('logConformanceTest', () => {
    it('should log conformance test with correct path', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      activityLogger.logConformanceTest(
        'test-run-123',
        'completed',
        {
          testName: 'API Test',
          duration: 5000,
        }
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/pact/testing/test-run-123',
          level: 'info',
          message: 'Conformance test completed',
          content: expect.objectContaining({
            testRunId: 'test-run-123',
            status: 'completed',
            testName: 'API Test',
            duration: 5000,
          }),
        })
      );
    });
  });

  describe('logOrganization', () => {
    it('should log organization action with correct path', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      activityLogger.logOrganization(
        1,
        'created',
        { name: 'Org Name' }
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/pact/organizations/1',
          level: 'info',
          message: 'Organization created',
          organizationId: 1,
          content: expect.objectContaining({
            action: 'created',
            name: 'Org Name',
          }),
        })
      );
    });
  });

  describe('logError', () => {
    it('should log error with error details in content', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockInsertInto = jest.fn().mockReturnValue({ values: mockValues });
      (db.insertInto as any) = mockInsertInto;

      const testError = new Error('Test error');
      testError.stack = 'Error stack trace';

      activityLogger.logError(
        '/pact/system/error',
        testError
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/pact/system/error',
          level: 'error',
          message: 'Test error',
          content: {
            name: 'Error',
            message: 'Test error',
            stack: 'Error stack trace',
          },
        })
      );
    });
  });
});
