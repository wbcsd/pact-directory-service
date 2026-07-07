import { test, expect } from "./fixtures";

test.describe("Activity Logs", () => {
  // ---------------------------------------------------------------------------
  // List page
  // ---------------------------------------------------------------------------

  test("activity logs page renders grouped paths with count badges", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/activity-logs");

    await expect(page.getByRole("columnheader", { name: "Path" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Count" })).toBeVisible();

    // Mock paths from activity-logs.ts
    await expect(page.getByText("/api/directory/nodes/100/footprints")).toBeVisible();
    await expect(page.getByText("/api/directory/nodes/100/connections")).toBeVisible();
  });

  test("activity logs page shows count badge with number", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/activity-logs");

    // The count badge renders inside a Radix Badge (rt-Badge class)
    // Use a Badge role or scoped locator to avoid matching the date's "5" digit
    await expect(page.locator(".rt-Badge").filter({ hasText: /^5$/ })).toBeVisible();
  });

  test("activity logs page shows last message", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/activity-logs");

    await expect(page.getByText("Footprint created successfully")).toBeVisible();
  });

  test("searching activity logs filters the table", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({
      getActivityLogs: {
        data: [
          {
            path: "/api/directory/nodes/100/footprints",
            count: 5,
            lastCreatedAt: "2026-04-25T10:00:00.000Z",
            lastLevel: "info",
            lastMessage: "Footprint created successfully",
          },
        ],
        pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1, hasNext: false, hasPrevious: false },
      },
    });

    await page.goto("/activity-logs");

    await page.getByPlaceholder(/search/i).fill("footprints");

    // The connections path should not be visible after filtering
    await expect(page.getByText("/api/directory/nodes/100/connections")).not.toBeVisible();
    await expect(page.getByText("/api/directory/nodes/100/footprints")).toBeVisible();
  });

  test("clicking a path row navigates to the detail page", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/activity-logs");

    await page.getByText("/api/directory/nodes/100/footprints").click();

    await expect(page).toHaveURL(/\/activity-logs\/path/);
    await expect(page).toHaveURL(/path=%2Fapi%2Fdirectory%2Fnodes%2F100%2Ffootprints/);
  });

  // ---------------------------------------------------------------------------
  // Detail page
  // ---------------------------------------------------------------------------

  test("detail page shows the path and total log count", async ({
    authenticatedPage: page,
  }) => {
    const encodedPath = encodeURIComponent("/api/directory/nodes/100/footprints");
    await page.goto(`/activity-logs/path?path=${encodedPath}`);

    await expect(page.getByText("/api/directory/nodes/100/footprints")).toBeVisible();
    // Total: 2 entries from mock
    await expect(page.getByText(/total logs.*2|2.*log/i)).toBeVisible();
  });

  test("detail page shows log entries in Table view by default", async ({
    authenticatedPage: page,
  }) => {
    const encodedPath = encodeURIComponent("/api/directory/nodes/100/footprints");
    await page.goto(`/activity-logs/path?path=${encodedPath}`);

    // Table view: log messages visible
    await expect(page.getByText("Footprint created successfully")).toBeVisible();
    await expect(page.getByText("Footprint import started")).toBeVisible();
  });

  test("toggling to Raw Logs view shows formatted text", async ({
    authenticatedPage: page,
  }) => {
    const encodedPath = encodeURIComponent("/api/directory/nodes/100/footprints");
    await page.goto(`/activity-logs/path?path=${encodedPath}`);

    await page.getByRole("button", { name: /raw logs/i }).click();

    // Raw view uses LazyLog — the log text should appear somewhere on the page
    await expect(page.getByText(/Footprint created successfully/)).toBeVisible();
  });

  test("switching back to Table View shows the card layout again", async ({
    authenticatedPage: page,
  }) => {
    const encodedPath = encodeURIComponent("/api/directory/nodes/100/footprints");
    await page.goto(`/activity-logs/path?path=${encodedPath}`);

    await page.getByRole("button", { name: /raw logs/i }).click();
    await page.getByRole("button", { name: /table view/i }).click();

    await expect(page.getByText("Footprint created successfully")).toBeVisible();
  });

  test("Refresh button re-fetches logs", async ({
    authenticatedPage: page,
  }) => {
    const encodedPath = encodeURIComponent("/api/directory/nodes/100/footprints");

    let callCount = 0;
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:3010/api";
    await page.route(`${apiBase}/directory/activity-logs/path*`, (route) => {
      callCount++;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          logs: [
            {
              id: 501,
              path: "/api/directory/nodes/100/footprints",
              level: "info",
              message: "Footprint created successfully",
              content: null,
              nodeId: 100,
              organizationId: 10,
              userId: 1,
              createdAt: "2026-04-25T10:00:00.000Z",
            },
          ],
          total: 1,
        }),
      });
    });

    await page.goto(`/activity-logs/path?path=${encodedPath}`);
    await page.getByRole("button", { name: /refresh/i }).click();

    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  test("Back button navigates away from the detail page", async ({
    authenticatedPage: page,
  }) => {
    // Navigate from the list page first so there is history to go back to
    await page.goto("/activity-logs");
    await page.getByText("/api/directory/nodes/100/footprints").click();
    await expect(page).toHaveURL(/\/activity-logs\/path/);

    await page.getByRole("button", { name: "Back", exact: true }).click();

    // Back navigates to the previous page (/activity-logs list)
    await expect(page).toHaveURL(/\/activity-logs$/);
  });

  // ---------------------------------------------------------------------------
  // Node dashboard — Activity Logs tab
  // ---------------------------------------------------------------------------

  test("node dashboard Activity Logs section shows logs for that node", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // The Activity Logs section is visible without clicking any tab
    await expect(page.getByRole("heading", { name: "Activity Logs" })).toBeVisible();
    // NodeDashboardPage fetchLogs expects {logs, total} and renders log.message
    await expect(page.getByText("Footprint created successfully")).toBeVisible({ timeout: 5000 });
  });
});
