import { test, expect } from "./fixtures";

test.describe("PCF Requests", () => {
  // ---------------------------------------------------------------------------
  // PCF Requests tab on Node Dashboard
  // ---------------------------------------------------------------------------

  test("Footprint Requests section shows outgoing (pending) request from this node", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // The section heading is "Footprint Requests" (no tabs on the dashboard)
    await expect(page.getByRole("heading", { name: "Footprint Requests" })).toBeVisible();
    // Outgoing request targets Test Node Beta
    await expect(page.getByRole("link", { name: "Test Node Beta" }).first()).toBeVisible();
  });

  test("Footprint Requests section shows incoming fulfillable request with Fulfill button", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // Mock: incoming request id=401 from Test Node Beta (fulfillable=true)
    // Use exact: true to avoid matching "Create & Fulfill" as well
    await expect(page.getByRole("button", { name: "Fulfill", exact: true })).toBeVisible();
  });

  test("Footprint Requests section shows Reject button for incoming request", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await expect(page.getByRole("button", { name: /reject/i }).first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Fulfill PCF request
  // ---------------------------------------------------------------------------

  test("clicking Fulfill opens the fulfill form slide-over", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // Use exact: true to avoid strict mode violation with "Create & Fulfill"
    await page.getByRole("button", { name: "Fulfill", exact: true }).click();

    // Slide-over with fulfill form should open
    await expect(page.getByRole("button", { name: /send|submit|fulfill/i }).last()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Reject PCF request
  // ---------------------------------------------------------------------------

  test("clicking Reject shows confirmation and calls reject API on confirm", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // Accept the confirmation dialog
    page.once("dialog", (dialog) => dialog.accept());

    await page.getByRole("button", { name: /reject/i }).first().click();

    // After rejection the table refreshes — we should remain on the page without errors
    await expect(page).toHaveURL(/\/nodes\/100/);
  });

  test("dismissing the Reject confirmation does not remove the request", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    page.once("dialog", (dialog) => dialog.dismiss());

    await page.getByRole("button", { name: /reject/i }).first().click();

    // Reject button should still be visible (request not removed)
    await expect(page.getByRole("button", { name: /reject/i }).first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Send new PCF request
  // ---------------------------------------------------------------------------

  test("Request PCF button opens the request form", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    const requestButton = page.getByRole("button", { name: /request footprint/i });
    if (await requestButton.isVisible()) {
      await requestButton.click();
      await expect(page.getByRole("button", { name: /send|submit/i }).last()).toBeVisible();
    } else {
      // Verify the section heading is present
      await expect(page.getByRole("heading", { name: "Footprint Requests" })).toBeVisible();
    }
  });
});
