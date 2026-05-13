import type { Page } from "@playwright/test";

/**
 * Playwright MCP --init-page script.
 *
 * Seeds a JWT into localStorage before each page's scripts run so the AI
 * agent can browse authenticated routes during test generation sessions.
 * The token value ("e2e-test-token") matches what the existing e2e fixtures
 * inject, and what the mock handlers respond to for GET /directory/users/me.
 *
 * Usage — start the MCP server with:
 *   npx @playwright/mcp@latest --isolated --init-page apps/directory-portal/e2e/mcp-init-page.ts
 * (from the repo root, with `npm run dev` already running)
 */
export default async ({ page }: { page: Page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("jwt", "e2e-test-token");
  });
};
