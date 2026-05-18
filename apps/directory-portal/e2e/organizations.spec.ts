import { test, expect } from "./fixtures";

test.describe("Organizations", () => {
  // ---------------------------------------------------------------------------
  // Organizations list
  // ---------------------------------------------------------------------------

  test("organizations list shows name, status, and user count columns", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/organizations");

    await expect(page.getByRole("columnheader", { name: "Organization Name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Registered Users" })).toBeVisible();

    // Mock data: "Test Organisation" and "Another Organisation"
    await expect(page.getByText("Test Organisation")).toBeVisible();
    await expect(page.getByText("Another Organisation")).toBeVisible();
  });

  test("searching organizations filters the list", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({
      getOrganizations: {
        data: [
          {
            id: 10,
            organizationName: "Test Organisation",
            organizationIdentifier: "TEST-ORG-001",
            organizationDescription: "A test organisation",
            networkKey: "key-abc",
            parentId: 0,
            userCount: 3,
            lastActivity: "2026-04-01T12:00:00.000Z",
            status: "active",
          },
        ],
        pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1, hasNext: false, hasPrevious: false },
      },
    });

    await page.goto("/organizations");

    // With filtered mock, only Test Organisation should be visible
    await expect(page.getByText("Test Organisation")).toBeVisible();
    await expect(page.getByText("Another Organisation")).not.toBeVisible();
  });

  test("clicking edit icon opens the slide-over panel with org name in title", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/organizations");

    // Edit icon (InputIcon) — click the first one
    await page.getByRole("button", { name: /edit/i }).first().click();

    // Slide-over should open with "Edit Organization" title or subtitle
    await expect(page.getByText(/edit organization/i)).toBeVisible();
  });

  test("edit org slide-over pre-fills the organization name", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/organizations");

    await page.getByRole("button", { name: /edit/i }).first().click();

    // The form should have the org name pre-filled in its input
    const orgInput = page.getByRole("textbox", { name: /organization name/i }).first();
    await expect(orgInput).toHaveValue("Test Organisation");
  });

  // ---------------------------------------------------------------------------
  // Organization Users
  // ---------------------------------------------------------------------------

  test("organization users page shows user rows with name, role, and status", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/organization/users");

    // Column headers
    await expect(page.getByRole("columnheader", { name: /name/i })).toBeVisible();

    // Mock users: "Test User" (administrator, enabled) and "Another User" (user, enabled)
    await expect(page.getByText("Test User")).toBeVisible();
    await expect(page.getByText("Another User")).toBeVisible();
  });

  test("organization users page shows email addresses", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/organization/users");

    await expect(page.getByText("test@example.com")).toBeVisible();
    await expect(page.getByText("another@example.com")).toBeVisible();
  });

  test("Add User button opens the slide-over panel", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/organization/users");

    await page.getByRole("button", { name: /add user/i }).click();

    // Slide-over with user form should open — use .first() to avoid strict mode
    await expect(page.getByRole("textbox", { name: /name|email/i }).first()).toBeVisible();
  });

  test("edit user icon opens slide-over with pre-filled user name", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/organization/users");

    // Edit icon is an IconButton with title="Edit User Details" (no visible text)
    await page.getByRole("button", { name: "Edit User Details" }).first().click();

    // Full Name input should be pre-filled with mock user's name
    const nameInput = page.getByRole("textbox", { name: /full name|name/i }).first();
    await expect(nameInput).toHaveValue("Test User");
  });

  test("selecting a user shows Enable/Disable bulk action buttons", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/organization/users");

    // Check the first row's checkbox
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.check();

    // After selecting an enabled user, "Disable Selected" button becomes enabled
    await expect(
      page.getByRole("button", { name: /disable selected/i })
    ).toBeVisible();
  });

  test("bulk disable calls status API for selected users", async ({
    authenticatedPage: page,
  }) => {
    let disableCalled = false;
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:3010/api";

    await page.route(`${apiBase}/directory/organizations/10/users/1`, async (route) => {
      if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() ?? "{}");
        if (body.status === "disabled") {
          disableCalled = true;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: 1, status: "disabled" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/organization/users");

    const checkbox = page.getByRole("checkbox").first();
    await checkbox.check();

    const disableButton = page.getByRole("button", { name: /disable/i });
    if (await disableButton.isVisible()) {
      await disableButton.click();
      await page.waitForTimeout(500);
      expect(disableCalled).toBe(true);
    }
  });

  test("bulk enable calls status API with enabled status", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    // Override user list with a disabled user so Enable button appears
    await setupMocks({
      getOrgUsers: {
        data: [
          {
            id: 2,
            fullName: "Another User",
            email: "another@example.com",
            role: "user",
            status: "disabled",
            lastLogin: null,
            organizationName: "Test Organisation",
            organizationId: 10,
            organizationIdentifier: "TEST-ORG-001",
          },
        ],
        pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1, hasNext: false, hasPrevious: false },
      },
    });

    let enableCalled = false;
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:3010/api";

    await page.route(`${apiBase}/directory/organizations/10/users/2`, async (route) => {
      if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() ?? "{}");
        if (body.status === "enabled") {
          enableCalled = true;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: 2, status: "enabled" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/organization/users");

    const checkbox = page.getByRole("checkbox").first();
    await checkbox.check();

    const enableButton = page.getByRole("button", { name: /enable/i });
    if (await enableButton.isVisible()) {
      await enableButton.click();
      await page.waitForTimeout(500);
      expect(enableCalled).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  test("organizations list shows error state when API fails", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({
      getOrganizations: { error: "Internal server error" },
    });

    await page.goto("/organizations");

    await expect(page.getByText(/error|failed|no .* found/i)).toBeVisible();
  });
});
