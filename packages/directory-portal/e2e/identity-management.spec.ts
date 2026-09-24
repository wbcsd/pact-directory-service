import { test, expect } from "./fixtures";

/**
 * Covers dynamic client registration (RFC 7591) for directory-hosted nodes. The
 * DCR responses are mocked inside the app (src/mocking/dcr-mock.ts), so unlike
 * the other specs these need no Playwright route handlers of their own.
 *
 * Registration applies to internal targets only; external nodes are third-party
 * systems and keep the manual credential exchange.
 *
 * The mock adds ~450ms of latency per call to keep the progress list readable,
 * hence the generous timeouts on the multi-step assertions.
 */

const STEP_TIMEOUT = 20_000;
const REGISTRATION_STEPS = ["discover", "register", "token", "verify"];

async function selectTarget(page: import("@playwright/test").Page, kind: "internal" | "external") {
  await page.getByRole("combobox").last().click();
  await page.getByRole("option").filter({ hasText: new RegExp(kind, "i") }).first().click();
}

test.describe("connecting to a directory-hosted node", () => {
  test("offers automatic registration instead of issuing credentials to copy", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/create-connection");
    await selectTarget(page, "internal");

    await expect(page.getByText(/hosted by the directory/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /get credentials automatically/i })
    ).toBeVisible();
  });

  test("obtains and verifies credentials without the user copying anything", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/create-connection");
    await selectTarget(page, "internal");
    await page.getByRole("button", { name: /get credentials automatically/i }).click();

    for (const step of REGISTRATION_STEPS) {
      await expect(page.getByTestId(`dcr-step-${step}`)).toHaveAttribute("data-status", "done", {
        timeout: STEP_TIMEOUT,
      });
    }

    await expect(page.getByText("Issued automatically")).toBeVisible();
  });
});

test.describe("connecting to an external node", () => {
  test("keeps the manual credential exchange untouched", async ({ authenticatedPage: page }) => {
    await page.goto("/nodes/100/create-connection");
    await selectTarget(page, "external");

    await expect(page.getByPlaceholder("OAuth2 client ID")).toBeVisible();
    await expect(page.getByPlaceholder("OAuth2 client secret")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /get credentials automatically/i })
    ).toHaveCount(0);
  });
});

test.describe("registration settings on an internal node's detail page", () => {
  test("exposes the registration and discovery URLs", async ({ authenticatedPage: page }) => {
    await page.goto("/nodes/100");

    await expect(page.getByRole("heading", { name: "Registration" })).toBeVisible();
    await expect(page.getByText("Registration endpoint").first()).toBeVisible({
      timeout: STEP_TIMEOUT,
    });
    await expect(page.getByText("Discovery document")).toBeVisible();
  });

  test("lists registered partners and revokes one after confirmation", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await expect(page.getByText("Acme Steel PACT Node")).toBeVisible({ timeout: STEP_TIMEOUT });
    await page.getByRole("button", { name: "Revoke Acme Steel PACT Node" }).click();

    const confirm = page.getByRole("alertdialog");
    await expect(confirm.getByText(/no longer be able to obtain access tokens/i)).toBeVisible();
    await confirm.getByRole("button", { name: /revoke client/i }).click();

    await expect(page.getByText("revoked").first()).toBeVisible({ timeout: STEP_TIMEOUT });
  });
});
