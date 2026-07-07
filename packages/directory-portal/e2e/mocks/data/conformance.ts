import { makePaginated } from "./utils";

export interface TestRun {
  testRunId: string;
  techSpecVersion: string;
  timestamp: string;
  organizationName: string;
  adminEmail: string;
  passingPercentage: number;
  status: "PASS" | "FAIL" | "PENDING";
}

export interface TestResult {
  testRunId: string;
  testName: string;
  status: "PASS" | "FAIL" | "PENDING";
  message: string | null;
}

export const mockTestRuns: TestRun[] = [
  {
    testRunId: "run-001",
    techSpecVersion: "2.2.0",
    timestamp: "2026-04-20T14:00:00.000Z",
    organizationName: "Test Organisation",
    adminEmail: "test@example.com",
    passingPercentage: 100,
    status: "PASS",
  },
  {
    testRunId: "run-002",
    techSpecVersion: "2.2.0",
    timestamp: "2026-04-18T10:00:00.000Z",
    organizationName: "Test Organisation",
    adminEmail: "test@example.com",
    passingPercentage: 75,
    status: "FAIL",
  },
];

export const mockTestResults: TestResult[] = [
  {
    testRunId: "run-001",
    testName: "Auth2 - Get Footprints",
    status: "PASS",
    message: null,
  },
  {
    testRunId: "run-001",
    testName: "Auth2 - Filter by date",
    status: "PASS",
    message: null,
  },
];

export const mockTestRunListResponse = makePaginated(mockTestRuns);

/** Proper response shape that ConformanceTestDetailPage expects from GET /proxy/test-results */
export const mockTestResultsResponse = {
  results: [
    {
      name: "Auth2 - Get Footprints",
      status: "SUCCESS",
      mandatory: true,
      errorMessage: "",
      testKey: "TESTCASE#1",
      documentationUrl: "",
      log: [],
    },
    {
      name: "Auth2 - Filter by date",
      status: "SUCCESS",
      mandatory: true,
      errorMessage: "",
      testKey: "TESTCASE#2",
      documentationUrl: "",
      log: [],
    },
  ],
  techSpecVersion: "2.2.0",
  organizationName: "Test Organisation",
  adminName: "Test User",
  adminEmail: "test@example.com",
  timestamp: "2026-04-20T14:00:00.000Z",
};

export const mockPostTestResponse = {
  testRunId: "run-new-001",
};
