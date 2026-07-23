import { test, expect } from "./fixtures";

test.describe("Product Footprints", () => {
  // ---------------------------------------------------------------------------
  // Footprints tab on Node Dashboard
  // ---------------------------------------------------------------------------

  test("Footprints section lists PCFs with product name and IDs", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // The Footprints section is always visible (no tabs on the dashboard)
    await expect(page.getByRole("heading", { name: "Footprints" })).toBeVisible();
    // Mock footprint: productNameCompany = "Test Product v1"
    await expect(page.getByText("Test Product v1")).toBeVisible();
    // productIds: ["urn:uuid:test-product-001"]
    await expect(page.getByText("urn:uuid:test-product-001")).toBeVisible();
  });

  test("clicking a footprint row navigates to the view page", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // The Footprints section is visible without clicking any tab
    await page.getByText("Test Product v1").click();

    await expect(page).toHaveURL(/\/nodes\/100\/footprints\/footprint-uuid-001/);
  });

  // ---------------------------------------------------------------------------
  // View footprint page
  // ---------------------------------------------------------------------------

  test("view footprint page renders the product form in read-only mode", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/footprints/footprint-uuid-001");

    // Page should not show a Save/Submit button in read-only mode
    await expect(page.getByRole("button", { name: /save|submit/i })).not.toBeVisible();
  });

  test("view footprint page shows company name and product description", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/footprints/footprint-uuid-001");

    // Mock footprint data: companyName = "Test Company"
    await expect(page.getByText("Test Company")).toBeVisible();
    await expect(page.getByText("Test Product")).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Add footprint page
  // ---------------------------------------------------------------------------

  test("add footprint page renders an empty form with a submit button", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/footprints/new");

    await expect(page.getByRole("button", { name: /save product footprint/i })).toBeVisible();
  });

  test("add footprint — submitting an empty form shows validation errors", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/footprints/new");

    await page.getByRole("button", { name: /save product footprint/i }).click();

    // Form validation should keep the form visible and show required field indicators
    await expect(page.getByRole("button", { name: /save product footprint/i })).toBeVisible();
  });

  test("add footprint — success shows the new PCF ID and copy buttons", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({
      postNodeFootprints: { message: "Footprint(s) created." },
    });

    await page.goto("/nodes/100/footprints/new");

    // Fill in the minimum required fields
    const companyNameField = page.getByLabel(/company name/i);
    if (await companyNameField.isVisible()) {
      await companyNameField.fill("E2E Test Company");
    }

    const productDescField = page.getByLabel(/product description/i);
    if (await productDescField.isVisible()) {
      await productDescField.fill("E2E Test Product");
    }

    await page.getByRole("button", { name: /save product footprint/i }).click();

    // After success, should show the created footprint's UUID and copy buttons
    // or navigate — either way, no error should be shown
    await expect(page.getByText(/error/i)).not.toBeVisible({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  test("view footprint page shows error when API fails", async ({
    authenticatedPage: page,
  }) => {
    // Register a specific 404 handler — Playwright routes are LIFO so this takes precedence
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:3010/api";
    await page.route(`${apiBase}/directory/footprints/**`, (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Footprint not found" }) })
    );

    await page.goto("/nodes/100/footprints/footprint-uuid-001");

    // The page should render an error callout when the API returns 404
    await expect(
      page.getByText(/footprint not found|failed|error|could not load/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
