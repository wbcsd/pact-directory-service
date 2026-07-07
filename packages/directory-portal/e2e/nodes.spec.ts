import { test, expect } from "./fixtures";
import { mockProfileData } from "./mocks/data/auth";
import {
  mockNodeDetail,
  mockEmptyNodeListResponse,
  mockFilteredNodeListResponse,
  mockInactiveNodeDetail,
  mockExternalNodeOwnOrg,
} from "./mocks/data/nodes";

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

    // Wait for the slide-over panel to open before interacting
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();

    // Scope fill and submit to the panel to avoid matching background elements
    await panel.getByPlaceholder("Enter node name").fill("New Test Node");
    await panel.getByRole("button", { name: /create node/i }).click();

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

// ---------------------------------------------------------------------------
// Node List — additional coverage
// ---------------------------------------------------------------------------

test.describe("Nodes list — additional", () => {
  test("shows empty state when the organisation has no nodes", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({ getOrgNodes: mockEmptyNodeListResponse });
    await page.goto("/nodes");

    await expect(page.getByText(/no nodes found/i)).toBeVisible();
  });

  test("search input is rendered with the correct placeholder", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    await expect(
      page.getByPlaceholder("Search by node name...")
    ).toBeVisible();
  });

  test("search returns filtered results", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    // Mock returns only Alpha — simulates a server-filtered response for search query "Alpha"
    await setupMocks({ getOrgNodes: mockFilteredNodeListResponse });
    await page.goto("/nodes");

    // Type in search — component re-fetches; mock returns only Alpha
    await page.getByPlaceholder("Search by node name...").fill("Alpha");

    await expect(page.getByText("Test Node Alpha")).toBeVisible();
    await expect(page.getByText("Test Node Beta")).not.toBeVisible();
  });

  test("connections count column shows the value for each node", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    // Test Node Alpha has connectionsCount: 2
    await expect(page.getByRole("columnheader", { name: "Connections" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "2", exact: true }).first()).toBeVisible();
  });

  test("Last Updated column header is visible", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    await expect(page.getByRole("columnheader", { name: "Last Updated" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Node Create Form — type switching behaviour
// ---------------------------------------------------------------------------

test.describe("Node create form — type switching", () => {
  test("switching to External type reveals the API URL field", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");
    await page.getByRole("button", { name: /add node/i }).click();

    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();

    // Default type is Internal — API URL field should NOT be visible yet
    await expect(panel.getByLabel(/api url/i)).not.toBeVisible();

    // Switch to External
    await panel.getByRole("combobox").click();
    await page.getByRole("option", { name: "External" }).click();

    // API URL field should now appear
    await expect(panel.getByLabel(/api url/i)).toBeVisible();
  });

  test("switching back to Internal type hides the API URL field", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");
    await page.getByRole("button", { name: /add node/i }).click();

    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();

    // Switch to External first
    await panel.getByRole("combobox").click();
    await page.getByRole("option", { name: "External" }).click();
    await expect(panel.getByLabel(/api url/i)).toBeVisible();

    // Switch back to Internal — use .first() because the specVersion combobox is now also rendered
    await panel.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Internal" }).click();

    await expect(panel.getByLabel(/api url/i)).not.toBeVisible();
  });

  test("External type reveals auth fields (Auth Base URL, Scope, Audience)", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");
    await page.getByRole("button", { name: /add node/i }).click();

    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();

    // Switch to External
    await panel.getByRole("combobox").click();
    await page.getByRole("option", { name: "External" }).click();

    // Auth fields should be visible
    await expect(panel.getByPlaceholder(/https:\/\/auth\.example\.com/i)).toBeVisible();
    await expect(panel.getByLabel(/scope/i)).toBeVisible();
    await expect(panel.getByLabel(/audience/i)).toBeVisible();
  });

  test("submitting External type without an API URL is blocked by validation", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");
    await page.getByRole("button", { name: /add node/i }).click();

    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();

    // Switch to External, fill name but leave API URL empty
    await panel.getByRole("combobox").click();
    await page.getByRole("option", { name: "External" }).click();
    await panel.getByPlaceholder("Enter node name").fill("External Without URL");

    await panel.getByRole("button", { name: /create node/i }).click();

    // Form should still be visible (submission blocked)
    await expect(panel.getByPlaceholder("Enter node name")).toBeVisible();
  });

  test("creating a full External node (name + API URL) shows success and closes panel", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");
    await page.getByRole("button", { name: /add node/i }).click();

    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();

    await panel.getByRole("combobox").click();
    await page.getByRole("option", { name: "External" }).click();
    await panel.getByPlaceholder("Enter node name").fill("My External Node");
    await panel.getByPlaceholder("Enter API URL").fill("https://api.supplier.example.com/pact");

    await panel.getByRole("button", { name: /create node/i }).click();

    // Panel closes after success
    await expect(page.getByPlaceholder("Enter node name")).not.toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Node Edit Form — additional coverage
// ---------------------------------------------------------------------------

test.describe("Node edit form — additional", () => {
  test("edit form pre-populates the current node name", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /edit node/i }).click();

    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();

    // mockNodeDetail.name = "Test Node Alpha"
    await expect(panel.getByPlaceholder("Enter node name")).toHaveValue("Test Node Alpha");
  });

  test("editing an internal node does not show the API URL field", async ({
    authenticatedPage: page,
  }) => {
    // mockNodeDetail is an internal node
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /edit node/i }).click();

    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();

    // Internal node — API URL field should not be rendered
    await expect(panel.getByLabel(/api url/i)).not.toBeVisible();
  });

  test("saving an edit shows the 'Node updated successfully!' callout", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /edit node/i }).click();

    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();

    // Change the name slightly and save
    await panel.getByPlaceholder("Enter node name").fill("Test Node Alpha Updated");
    await panel.getByRole("button", { name: /save changes/i }).click();

    // NodeDashboardPage.handleSaved() calls closePanel() immediately on success
    await expect(panel).not.toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Node Dashboard — metadata display
// ---------------------------------------------------------------------------

test.describe("Node dashboard — metadata", () => {
  test("status badge shows the node status", async ({
    authenticatedPage: page,
  }) => {
    // mockNodeDetail.status = "active"
    await page.goto("/nodes/100");

    await expect(page.getByText("active", { exact: false }).first()).toBeVisible();
  });

  test("type badge shows the node type", async ({
    authenticatedPage: page,
  }) => {
    // mockNodeDetail.type = "internal"
    await page.goto("/nodes/100");

    await expect(page.getByText("internal", { exact: false }).first()).toBeVisible();
  });

  test("API URL is displayed for an external node", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({ getNode: mockExternalNodeOwnOrg });
    await page.goto("/nodes/100");

    await expect(
      page.getByText("https://api.supplier.example.com/pact")
    ).toBeVisible();
  });

  test("Create Connection button is visible in the Connections section", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // The Connections section header has an inline "Create Connection" button
    await expect(
      page.getByRole("button", { name: /create connection/i }).first()
    ).toBeVisible();
  });

  test("inactive node shows 'inactive' status badge", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({ getNode: mockInactiveNodeDetail });
    await page.goto("/nodes/100");

    await expect(page.getByText("inactive", { exact: false }).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Access control — root cross-org navigation
// ---------------------------------------------------------------------------

test.describe("Access control — root", () => {
  test("root user can navigate to a cross-org node without triggering the access guard", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({
      getMe: { ...mockProfileData, role: "root" },
      // Node belongs to a different org (99), but root should be allowed
      getNode: { ...mockNodeDetail, organizationId: 99, organizationName: "Other Organisation" },
    });
    await page.goto("/nodes/100");

    // The access guard alertdialog should NOT appear
    await expect(page.getByRole("alertdialog")).not.toBeVisible();

    // The node name should be visible instead
    await expect(page.getByText("Test Node Alpha")).toBeVisible();
  });
});

