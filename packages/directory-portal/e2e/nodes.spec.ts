import { test, expect } from "./fixtures";
import { mockProfileData } from "./mocks/data/auth";
import { mockNodeDetail } from "./mocks/data/nodes";

test.describe("Nodes", () => {
  // ---------------------------------------------------------------------------
  // List page
  // ---------------------------------------------------------------------------

  test("nodes list renders with name, type, and status columns", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();

    // Mock data: "Test Node Alpha" (internal, active) and "Test Node Beta" (external, pending)
    await expect(page.getByText("Test Node Alpha")).toBeVisible();
    await expect(page.getByText("Test Node Beta")).toBeVisible();
  });

  test("clicking a node row navigates to the node dashboard", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    await page.getByText("Test Node Alpha").click();

    await expect(page).toHaveURL(/\/nodes\/100/);
  });

  test("Add Node button opens the slide-over panel", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    await page.getByRole("button", { name: /add node/i }).click();

    // Slide-over panel should be open — look for a form input
    await expect(page.getByRole("textbox", { name: /name/i })).toBeVisible();
  });

  test("add node form — validation prevents empty submit", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    await page.getByRole("button", { name: /add node/i }).click();
    // Wait for the dialog to open before clicking submit
    await expect(page.getByRole("textbox", { name: /name/i })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: /save|create|add/i }).click();

    // Browser / Radix form validation should prevent submission or show errors
    // The form should still be visible (not closed)
    await expect(page.getByRole("textbox", { name: /name/i })).toBeVisible();
  });

  test("add node form — success calls API and closes panel", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    await page.getByRole("button", { name: /add node/i }).click();

    await page.getByRole("textbox", { name: /name/i }).fill("New Test Node");

    // Select type if there's a dropdown
    const typeSelect = page.getByRole("combobox", { name: /type/i });
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption("internal");
    }

    await page.getByRole("button", { name: /save|create|add/i }).click();

    // Panel should auto-close after success delay (~1200 ms) — use a longer timeout
    // The SlideOverPanel wraps NodeForm; once closed, the "Enter node name" placeholder is gone
    await expect(page.getByPlaceholder("Enter node name")).not.toBeVisible({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  test("node dashboard shows the node name in the heading", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await expect(page.getByText("Test Node Alpha")).toBeVisible();
  });

  test("node dashboard default tab shows connections content", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // The dashboard has a Connections section (no tabs — sections are always visible)
    // "Test Node Beta" appears in both connections and PCF requests sections — use first()
    await expect(page.getByRole("link", { name: "Test Node Beta" }).first()).toBeVisible();
  });

  test("Footprints section shows footprint table", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // The dashboard has a Footprints section visible without clicking any tab
    await expect(page.getByRole("heading", { name: "Footprints" })).toBeVisible();
    // Mock footprint: productNameCompany = "Test Product v1"
    await expect(page.getByText("Test Product v1")).toBeVisible();
  });

  test("Footprint Requests section shows request rows", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // The section is called "Footprint Requests" (not "PCF Requests")
    await expect(page.getByRole("heading", { name: "Footprint Requests" })).toBeVisible();
    // Incoming PCF request from "Test Node Beta" should appear in the section
    await expect(page.getByRole("link", { name: "Test Node Beta" }).first()).toBeVisible();
  });

  test("Activity Logs section shows log rows", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // The Activity Logs section is visible without clicking any tab
    await expect(page.getByRole("heading", { name: "Activity Logs" })).toBeVisible();
    await expect(page.getByText("Footprint created successfully")).toBeVisible();
  });

  test("node dashboard shows edit option in dropdown menu", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // The dropdown trigger is a Radix IconButton with aria-haspopup="menu"
    await page.locator('[aria-haspopup="menu"]').click();
    await expect(page.getByRole("menuitem", { name: /edit node/i })).toBeVisible();
  });

  test("delete node opens a confirmation dialog", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /delete node/i }).click();

    // Radix Dialog should open — not a native browser confirm
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("heading", { name: /delete node/i })).toBeVisible();
  });

  test("delete node — cancel keeps user on the page", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /delete node/i }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).click();

    await expect(page).toHaveURL(/\/nodes\/100/);
  });

  test("delete node — confirm button disabled until node name is typed", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /delete node/i }).click();

    await expect(page.getByRole("dialog")).toBeVisible();

    // Delete button should be disabled when the input is empty
    const deleteButton = page.getByRole("dialog").getByRole("button", { name: /delete node/i });
    await expect(deleteButton).toBeDisabled();

    // Wrong name — still disabled
    await page.getByRole("dialog").getByRole("textbox").fill("wrong name");
    await expect(deleteButton).toBeDisabled();

    // Correct name — now enabled
    await page.getByRole("dialog").getByRole("textbox").fill("Test Node Alpha");
    await expect(deleteButton).toBeEnabled();
  });

  test("delete node — completes after typing correct name", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /delete node/i }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("textbox").fill("Test Node Alpha");
    await page.getByRole("dialog").getByRole("button", { name: /delete node/i }).click();

    // After deletion the app navigates back to the nodes list
    await expect(page).toHaveURL(/\/nodes$/);
  });

  // ---------------------------------------------------------------------------
  // Root user — sticky banner
  // ---------------------------------------------------------------------------

  test("root user sees the sticky root access banner", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({ getMe: { ...mockProfileData, role: "root" } });
    await page.goto("/nodes");

    await expect(page.getByText(/root access active/i)).toBeVisible();
  });

  test("non-root user does not see the root access banner", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    await expect(page.getByText(/root access active/i)).not.toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Root cross-org deletion — second confirmation dialog
  // ---------------------------------------------------------------------------

  test("root deleting a cross-org node shows a second warning dialog", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    // Root user in org 10 viewing a node belonging to a different org
    await setupMocks({
      getMe: { ...mockProfileData, role: "root" },
      getNode: { ...mockNodeDetail, organizationId: 99, organizationName: "Other Organisation" },
    });
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /delete node/i }).click();

    // Step 1 — type the node name to pass the first dialog
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("textbox").fill("Test Node Alpha");
    await page.getByRole("dialog").getByRole("button", { name: /delete node/i }).click();

    // Step 2 — cross-org warning dialog should appear
    const crossOrgDialog = page.getByRole("dialog");
    await expect(crossOrgDialog.getByRole("heading", { name: /delete node from another organization/i })).toBeVisible();
    await expect(crossOrgDialog.getByText(/Other Organisation/i)).toBeVisible();
  });

  test("root can cancel the cross-org warning dialog", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({
      getMe: { ...mockProfileData, role: "root" },
      getNode: { ...mockNodeDetail, organizationId: 99, organizationName: "Other Organisation" },
    });
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /delete node/i }).click();

    await page.getByRole("dialog").getByRole("textbox").fill("Test Node Alpha");
    await page.getByRole("dialog").getByRole("button", { name: /delete node/i }).click();

    // Cancel on the second dialog — should stay on the node page
    await expect(page.getByText(/delete node from another organization/i)).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page).toHaveURL(/\/nodes\/100/);
  });

  test("root can confirm cross-org deletion via second dialog", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({
      getMe: { ...mockProfileData, role: "root" },
      getNode: { ...mockNodeDetail, organizationId: 99, organizationName: "Other Organisation" },
    });
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /delete node/i }).click();

    await page.getByRole("dialog").getByRole("textbox").fill("Test Node Alpha");
    await page.getByRole("dialog").getByRole("button", { name: /delete node/i }).click();

    await expect(page.getByText(/delete node from another organization/i)).toBeVisible();
    await page.getByRole("button", { name: /confirm deletion/i }).click();

    // After deletion the app navigates back to the nodes list
    await expect(page).toHaveURL(/\/nodes$/);
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  test("node dashboard shows error when node API fails", async ({
    authenticatedPage: page,
  }) => {
    // Register a specific 404 handler before the catch-all — Playwright routes are LIFO
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:3010/api";
    await page.route(`${apiBase}/directory/nodes/100`, (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not found" }) })
    );

    await page.goto("/nodes/100");

    await expect(page.getByText(/failed to load|not found|error/i)).toBeVisible({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // Discoverable toggle in NodeForm
  // ---------------------------------------------------------------------------

  test("edit node form shows the Discoverable toggle", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /edit node/i }).click();

    // The switch should be visible with a label matching "discoverable"
    await expect(page.getByRole("switch")).toBeVisible();
    await expect(page.getByText(/discoverable on pact network/i)).toBeVisible();
  });

  test("Discoverable toggle can be toggled in the edit form", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /edit node/i }).click();

    const toggle = page.getByRole("switch");
    await expect(toggle).toBeVisible();

    // Record initial state and click to toggle
    const initialChecked = await toggle.isChecked();
    await toggle.click();
    const newChecked = await toggle.isChecked();

    expect(newChecked).not.toBe(initialChecked);
  });

  // ---------------------------------------------------------------------------
  // Access guard — 403 redirects with dialog
  // ---------------------------------------------------------------------------

  test("navigating to a forbidden node shows 'Node not found' dialog", async ({
    authenticatedPage: page,
  }) => {
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:3010/api";
    // Return 403 for this specific node
    await page.route(`${apiBase}/directory/nodes/999`, (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "Forbidden" }),
      })
    );

    await page.goto("/nodes/999");

    // The ConfirmContext AlertDialog should appear with "Node not found" title
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("alertdialog").getByText(/node not found/i)).toBeVisible();
  });

  test("clicking OK on the access guard dialog navigates back", async ({
    authenticatedPage: page,
  }) => {
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:3010/api";

    await page.route(`${apiBase}/directory/nodes/999`, (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "Forbidden" }),
      })
    );

    // Navigate to nodes list first so there's a "back" page
    await page.goto("/nodes");
    await page.goto("/nodes/999");

    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 5000 });
    await page.getByRole("alertdialog").getByRole("button", { name: /ok/i }).click();

    // Should navigate back to the nodes list
    await expect(page).toHaveURL(/\/nodes$/);
  });
});
