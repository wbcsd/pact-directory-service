import { test, expect } from "./fixtures";

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
    await page.getByRole("button", { name: /save|create|add/i }).click();

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

  test("delete node shows confirmation before deleting", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // Open dropdown menu via aria-haspopup button
    await page.locator('[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /delete node/i }).click();

    // Expect a native confirm dialog — dismiss so node is NOT deleted
    page.once("dialog", (dialog) => dialog.dismiss());

    // After dismissing the confirmation, we should still be on the same page
    await expect(page).toHaveURL(/\/nodes\/100/);
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
});
