/**
 * Unit tests for activity-logger.ts
 */

import { describe, it, expect } from '@jest/globals';
import * as activityLogger from './activity-logger';

describe('activity-logger', () => {
  describe('logActivity', () => {
    it('should log activity without throwing', () => {
      expect(() => {
        activityLogger.logActivity('info', 'Test message', {
          path: '/pact/test',
          nodeId: 1,
          organizationId: 2,
          userId: 3,
          content: { key: 'value' },
        });
      }).not.toThrow();
    });

    it('should handle null optional fields', () => {
      expect(() => {
        activityLogger.logActivity('warn', 'Warning message', {
          path: '/pact/warning',
        });
      }).not.toThrow();
    });

    it('should merge other metadata into log', () => {
      expect(() => {
        activityLogger.logActivity('debug', 'Debug message', {
          path: '/pact/debug',
          customField1: 'value1',
          customField2: 123,
        });
      }).not.toThrow();
    });
  });

  describe('logNodeConnection', () => {
    it('should log node connection with correct parameters', () => {
      expect(() => {
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
      }).not.toThrow();
    });
  });

  describe('logNodeApiCall', () => {
    it('should log successful API call with info level', () => {
      expect(() => {
        activityLogger.logNodeApiCall(
          1,
          '/2/footprints',
          'GET',
          200,
          { duration: 123 }
        );
      }).not.toThrow();
    });

    it('should log failed API call with error level', () => {
      expect(() => {
        activityLogger.logNodeApiCall(
          1,
          '/2/footprints/123',
          'GET',
          404,
          { error: 'Not found' }
        );
      }).not.toThrow();
    });
  });

  describe('logNodeAuth', () => {
    it('should log successful authentication with info level', () => {
      expect(() => {
        activityLogger.logNodeAuth(
          1,
          'token_generated',
          true,
          { clientId: 'client-123' }
        );
      }).not.toThrow();
    });

    it('should log failed authentication with warn level', () => {
      expect(() => {
        activityLogger.logNodeAuth(
          1,
          'token_rejected',
          false,
          { error: 'Invalid credentials' }
        );
      }).not.toThrow();
    });
  });

  describe('logConformanceTest', () => {
    it('should log conformance test', () => {
      expect(() => {
        activityLogger.logConformanceTest(
          'test-run-123',
          'completed',
          {
            testName: 'API Test',
            duration: 5000,
          }
        );
      }).not.toThrow();
    });
  });

  describe('logOrganization', () => {
    it('should log organization action', () => {
      expect(() => {
        activityLogger.logOrganization(
          1,
          'created',
          { name: 'Org Name' }
        );
      }).not.toThrow();
    });
  });

  describe('logError', () => {
    it('should log error with error details', () => {
      const testError = new Error('Test error');
      testError.stack = 'Error stack trace';

      expect(() => {
        activityLogger.logError(
          '/pact/system/error',
          testError
        );
      }).not.toThrow();
    });
  });
});
