import { test as base, expect, type Page } from "@playwright/test";
import { setupApiMocks, type MockOverrides } from "./mocks/handlers";
import path from "path";
import fs from "fs";

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

    // Collect Istanbul coverage written to window.__coverage__ by vite-plugin-istanbul
    if (process.env.VITE_COVERAGE === "true") {
      const coverage = await page.evaluate(
        () => (window as unknown as { __coverage__?: unknown }).__coverage__
      );
      if (coverage) {
        const outputDir = path.join(process.cwd(), ".nyc_output");
        fs.mkdirSync(outputDir, { recursive: true });
        const fileName = `coverage-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
        fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(coverage));
      }
    }
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
