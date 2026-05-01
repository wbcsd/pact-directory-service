#!/usr/bin/env tsx
/**
 * Test Activity Logging
 * 
 * This script tests the activity logging system by creating sample logs.
 * Run with: npx tsx scripts/test-activity-logging.ts
 */

import { logNodeConnection, logNodeApiCall, logNodeAuth, logConformanceTest } from '../src/common/activity-logger';

console.log('Creating test activity logs...\n');

// Test 1: Node connection invitation
console.log('1. Logging node connection invitation...');
logNodeConnection(
  1, // fromNodeId
  2, // targetNodeId
  'invitation_sent',
  {
    connectionId: 101,
    fromNodeName: 'Test Company A - Production Node',
    targetNodeName: 'Test Company B - Production Node',
    organizationId: 1,
    // userId: 1,  // Commented out - will use null if user doesn't exist
    message: 'Would like to exchange carbon footprint data',
  }
);

// Test 2: Node connection accepted
console.log('2. Logging invitation accepted...');
logNodeConnection(
  2, // targetNodeId (now accepting)
  1, // fromNodeId
  'invitation_accepted',
  {
    connectionId: 101,
    fromNodeName: 'Test Company A - Production Node',
    targetNodeName: 'Test Company B - Production Node',
    organizationId: 2,
    // userId: 2,  // Commented out
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }
);

// Test 3: API call - success
console.log('3. Logging successful API call...');
logNodeApiCall(
  1,
  '/2/footprints',
  'GET',
  200,
  {
    duration: 123,
    resultCount: 5,
    organizationId: 1,
    filters: {
      productId: ['prod-123'],
    },
  }
);

// Test 4: API call - error
console.log('4. Logging failed API call...');
logNodeApiCall(
  1,
  '/2/footprints/invalid-id',
  'GET',
  404,
  {
    duration: 45,
    error: 'Not Found',
    organizationId: 1,
  }
);

// Test 5: Authentication success
console.log('5. Logging successful authentication...');
logNodeAuth(
  1,
  'token_generated',
  true,
  {
    clientId: 'test-client-123',
    grantType: 'client_credentials',
    organizationId: 1,
  }
);

// Test 6: Authentication failure
console.log('6. Logging failed authentication...');
logNodeAuth(
  2,
  'token_rejected',
  false,
  {
    clientId: 'invalid-client',
    error: 'Invalid credentials',
    organizationId: 2,
  }
);

// Test 7: Conformance test
console.log('7. Logging conformance test...');
logConformanceTest(
  'test-run-abc123',
  'completed',
  {
    testName: 'Footprint Data Exchange Test',
    status: 'passed',
    duration: 2500,
    assertions: {
      passed: 15,
      failed: 0,
      skipped: 2,
    },
    nodeId: 1,
    organizationId: 1,
    // userId: 1,  // Commented out
  }
);

// Test 8: Connection removed
console.log('8. Logging connection removed...');
logNodeConnection(
  1,
  2,
  'connection_removed',
  {
    connectionId: 101,
    fromNodeName: 'Test Company A - Production Node',
    targetNodeName: 'Test Company B - Production Node',
    organizationId: 1,
    // userId: 1,  // Commented out
    reason: 'Partnership ended',
  }
);

// Test 9: Footprints requested
console.log('9. Logging footprints requested...');
logNodeConnection(
  1,
  2,
  'footprints_requested',
  {
    connectionId: 101,
    fromNodeName: 'Test Company A - Production Node',
    targetNodeType: 'external',
    resultCount: 10,
    filters: {
      productId: ['prod-456', 'prod-789'],
      companyId: ['company-123'],
    },
    organizationId: 1,
    // userId: 1,  // Commented out
  }
);

// Test 10: Invitation rejected
console.log('10. Logging invitation rejected...');
logNodeConnection(
  3,
  1,
  'invitation_rejected',
  {
    connectionId: 102,
    fromNodeName: 'Test Company A - Production Node',
    targetNodeName: 'Test Company C - Production Node',
    organizationId: 3,
    // userId: 3,  // Commented out
    reason: 'Not interested at this time',
  }
);

console.log('\n✅ Test logs created successfully!');
console.log('\nYou can now view them at:');
console.log('- Web UI: http://localhost:5173/activity-logs');
console.log('- API: http://localhost:3000/api/activity-logs');
console.log('\nNote: It may take a moment for logs to appear in the database.');

// Give transport time to write logs
setTimeout(() => {
  console.log('\n✨ Logs should now be visible in the UI!');
  process.exit(0);
}, 2000);
