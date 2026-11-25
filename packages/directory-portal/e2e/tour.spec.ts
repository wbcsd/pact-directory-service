import { test, expect, type Page } from "@playwright/test";
import { setupApiMocks } from "./mocks/handlers";
import { mockProfileData } from "./mocks/data/auth";
import { productTourStorageKey } from "../src/utils/tour-storage";

const TOUR_KEY = productTourStorageKey(mockProfileData.id);

const dialog = (page: Page) =>
  page.getByRole("dialog").filter({ hasText: "Would you like a quick tour" });

const readFlag = (page: Page) =>
  page.evaluate((key) => window.localStorage.getItem(key), TOUR_KEY);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("jwt", "e2e-test-token");
  });
  // Opt out of the shared suppression so the real first-login flow runs.
  await setupApiMocks(page, {}, { suppressTour: false });
});

test.describe("Product tour", () => {
  test("offers the tour on the first authenticated page load", async ({ page }) => {
    await page.goto("/conformance-test-runs");

    await expect(dialog(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Take the tour" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remind me later" })).toBeVisible();
    await expect(page.getByRole("button", { name: "No thanks" })).toBeVisible();
  });

  test("declining sets the flag immediately and does not prompt again", async ({ page }) => {
    await page.goto("/conformance-test-runs");

    await page.getByRole("button", { name: "No thanks" }).click();
    await expect(dialog(page)).toBeHidden();
    expect(await readFlag(page)).toBe("true");

    await page.reload();
    await expect(page.getByRole("heading", { name: "Conformance Tests" })).toBeVisible();
    await expect(dialog(page)).toBeHidden();
  });

  test("postponing closes it without setting the flag", async ({ page }) => {
    await page.goto("/conformance-test-runs");

    await page.getByRole("button", { name: "Remind me later" }).click();
    await expect(dialog(page)).toBeHidden();
    expect(await readFlag(page)).toBeNull();

    // Navigating within the same app load must not re-prompt...
    await page.getByRole("link", { name: "Activity Logs" }).click();
    await expect(dialog(page)).toBeHidden();

    // ...but a fresh load offers it again.
    await page.goto("/conformance-test-runs");
    await expect(dialog(page)).toBeVisible();
  });

  test("taking the tour walks the menu, conformance and node sections", async ({ page }) => {
    await page.goto("/conformance-test-runs");

    await page.getByRole("button", { name: "Take the tour" }).click();
    await expect(page.getByText("Welcome to the PACT Directory")).toBeVisible();

    // Same element for every step — it reads "Next" until the last step, then "Finish".
    const primary = page.locator('[data-test-id="button-primary"]');
    const isLastStep = async () =>
      (await primary.getAttribute("aria-label")) === "Finish";

    // Advance until the tour auto-navigates to the nodes page.
    for (let i = 0; i < 20 && !page.url().includes("/nodes"); i++) {
      await primary.click();
    }
    await expect(page).toHaveURL(/\/nodes$/);
    await expect(
      page.getByRole("heading", { name: "The PACT Network", exact: true })
    ).toBeVisible();

    for (let i = 0; i < 20 && !(await isLastStep()); i++) {
      await primary.click();
    }
    expect(await isLastStep()).toBe(true);
    await primary.click();

    await expect(primary).toBeHidden();
    expect(await readFlag(page)).toBe("true");

    await page.goto("/conformance-test-runs");
    await expect(dialog(page)).toBeHidden();
  });

  test("can be replayed from the Support menu", async ({ page }) => {
    await page.goto("/activity-logs");
    await page.getByRole("button", { name: "Remind me later" }).click();

    await page.getByRole("button", { name: "Take the product tour" }).click();

    await expect(page).toHaveURL(/\/conformance-test-runs$/);
    await expect(page.getByText("Welcome to the PACT Directory")).toBeVisible();
  });
});
