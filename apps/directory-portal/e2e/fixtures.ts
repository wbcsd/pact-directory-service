import { test as base, expect, type Page } from "@playwright/test";
import { setupApiMocks, type MockOverrides } from "./mocks/handlers";

const VITE_API_BASE =
  process.env.VITE_DIRECTORY_API ?? "http://localhost:3010/api";

export const test = base.extend<{
  /** Page with JWT seeded in localStorage and all API routes mocked. */
  authenticatedPage: Page;
  /**
   * Re-register mocks with per-test overrides. Call before `page.goto()`.
   *
   * @example
   * ```ts
   * test("shows error state", async ({ authenticatedPage: page, setupMocks }) => {
   *   await setupMocks({ getNode: { error: "Not found" } });
   *   await page.goto("/nodes/100");
   * });
   * ```
   */
  setupMocks: (overrides: MockOverrides) => Promise<void>;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Seed the JWT into localStorage before any page script runs
    await page.addInitScript((apiBase) => {
      window.localStorage.setItem("jwt", "e2e-test-token");
      // Expose the API base URL as the env var the app reads via import.meta.env
      // Vite bakes VITE_* vars at build time, so we override the fetch base
      // by patching the storage value the app uses for the token check only.
      // The actual base URL comes from the built bundle's VITE_DIRECTORY_API.
      void apiBase; // referenced to keep TS happy
    }, VITE_API_BASE);

    // Register all route mocks
    await setupApiMocks(page);

    await use(page);
  },

  setupMocks: async ({ page }, use) => {
    await use(async (overrides: MockOverrides) => {
      // Unroute previous handlers and re-register with overrides
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await setupApiMocks(page, overrides);
    });
  },
});

export { expect };
