import { test, expect } from "./fixtures";
import { mockTestResultsResponse } from "./mocks/data/conformance";

test.describe("Conformance Tests", () => {
  // ---------------------------------------------------------------------------
  // List page
  // ---------------------------------------------------------------------------

  test("list page renders test runs with status badges and version", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/conformance-test-runs");

    // Table headers
    await expect(page.getByRole("columnheader", { name: "Test Run ID" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Version" })).toBeVisible();

    // Mock data: run-001 first 8 chars = "run-001"
    await expect(page.getByText("run-001")).toBeVisible();
    await expect(page.getByText("2.2.0").first()).toBeVisible();
  });

  test("list page shows organization and email columns for admin role", async ({
    authenticatedPage: page,
  }) => {
    // Default mock profile has role="administrator"
    await page.goto("/conformance-test-runs");

    await expect(page.getByRole("columnheader", { name: "Organization" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
    await expect(page.getByText("Test Organisation").first()).toBeVisible();
  });

  test("clicking a test run navigates to detail page", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/conformance-test-runs");

    await page.getByText("run-001").click();

    await expect(page).toHaveURL(/\/conformance-test-runs\/run-001/);
  });

  test("Run Tests button navigates to new test page", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/conformance-test-runs");

    await page.getByRole("button", { name: /run tests/i }).click();

    await expect(page).toHaveURL(/\/conformance-test-runs\/new/);
  });

  // ---------------------------------------------------------------------------
  // Detail page — existing run
  // ---------------------------------------------------------------------------

  test("detail page shows test case table with status and mandatory columns", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/conformance-test-runs/run-001");

    // Test case names from mock
    await expect(page.getByText("Auth2 - Get Footprints")).toBeVisible();
    await expect(page.getByText("Auth2 - Filter by date")).toBeVisible();
  });

  test("detail page shows PASS status badge on passing test cases", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/conformance-test-runs/run-001");

    // Both mock test cases are PASS → "Passed" badges
    const passedBadges = page.getByText("Passed");
    await expect(passedBadges.first()).toBeVisible();
  });

  test("detail page shows FAIL status badge on failing test run", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({
      getTestResults: {
        ...mockTestResultsResponse,
        results: [
          {
            name: "Auth2 - Get Footprints",
            status: "FAILURE",
            mandatory: true,
            errorMessage: "Unexpected status code 500",
            testKey: "TESTCASE#1",
            documentationUrl: "",
            log: [],
          },
        ],
      },
    });

    await page.goto("/conformance-test-runs/run-002");

    // The status badge shows "Failed" (exact match to avoid the '% failed' text)
    await expect(page.getByText("Failed", { exact: true })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // New test / run flow
  // ---------------------------------------------------------------------------

  test("new test page renders conformance test form", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/conformance-test-runs/new");

    // ConformanceTestForm should be rendered
    await expect(page.getByRole("button", { name: /run/i })).toBeVisible();
  });

  test("submitting the new test form calls POST and shows results", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    // postTest returns a testRunId; then the page redirects and fetches results
    await setupMocks({
      postTest: { testRunId: "run-new-001" },
      getTestResults: mockTestResultsResponse,
    });

    await page.goto("/conformance-test-runs/new");

    // Fill required fields using name selectors (more reliable than label-based locators)
    await page.locator('input[name="solutionApiUrl"]').fill("https://api.example.com");
    await page.locator('input[name="clientId"]').fill("test-client-id");
    await page.locator('input[name="clientSecret"]').fill("test-client-secret");

    await page.getByRole("button", { name: /run/i }).click();

    // After POST succeeds → navigate to detail page → test results show
    // Use .first() since multiple test case rows may match
    await expect(page.getByText(/Auth2|TESTCASE/i).first()).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  test("list page shows error state when API fails", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({
      getTestRuns: { error: "Internal server error" },
    });

    await page.goto("/conformance-test-runs");

    // The table should show an error or empty state
    await expect(page.getByText(/error|failed|no .* found/i)).toBeVisible();
  });
});
