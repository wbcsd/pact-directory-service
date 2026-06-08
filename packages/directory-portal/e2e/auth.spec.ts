import { test, expect } from "@playwright/test";
import { setupApiMocks } from "./mocks/handlers";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:3010/api";

test.describe("Authentication smoke tests", () => {
  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  test("successful login redirects to conformance test runs", async ({ page }) => {
    // Set up all API mocks — default responses include a valid login token and
    // profile data, so no overrides needed for the happy path.
    await setupApiMocks(page);

    await page.goto("/login");

    await page.getByLabel("Email Address").fill("test@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Login" }).click();

    // After login the app navigates to the default authenticated landing page.
    await expect(page).toHaveURL(/\/conformance-test-runs/);
  });

  test("login with unverified email shows resend-verification link", async ({ page }) => {
    // Override the login endpoint to simulate a 403 EmailNotVerifiedError.
    await page.route(`${apiBase}/directory/users/login`, (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ name: "EmailNotVerifiedError", message: "Email not verified" }),
      })
    );

    await page.goto("/login");

    await page.getByLabel("Email Address").fill("unverified@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Login" }).click();

    // The unverified callout and resend link should be visible.
    await expect(page.getByText(/not been verified yet/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Resend verification email" })).toBeVisible();
    // User should remain on the login page.
    await expect(page).toHaveURL(/\/login/);
  });

  test("login with invalid credentials shows an error message", async ({ page }) => {
    // Override the login endpoint to simulate a 401 — no other mocks needed
    // because the user stays on the login page and no other API calls are made.
    await page.route(`${apiBase}/directory/users/login`, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid credentials" }),
      })
    );

    await page.goto("/login");

    await page.getByLabel("Email Address").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
    // User should remain on the login page.
    await expect(page).toHaveURL(/\/login/);
  });

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  test("clicking Logout navigates to the login page", async ({ page }) => {
    // Seed a JWT so the app treats the session as authenticated.
    await page.addInitScript(() => {
      window.localStorage.setItem("jwt", "e2e-test-token");
    });
    await setupApiMocks(page);

    await page.goto("/conformance-test-runs");

    // The Logout link is rendered by the SignUp component in the top-bar.
    const logoutLink = page.getByRole("link", { name: "Logout" });
    await expect(logoutLink).toBeVisible();
    await logoutLink.click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Log in to PACT Network Services")).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Session expiry
  // ---------------------------------------------------------------------------

  test("expired session redirects to the login page", async ({ page }) => {
    // The /users/me endpoint returns 401, which triggers logoutUser() in
    // auth-fetch.ts: clears localStorage and hard-navigates to /login.
    await page.route(`${apiBase}/directory/users/me`, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      })
    );

    // Navigate to any page first, then seed a stale JWT via page.evaluate().
    // We cannot use addInitScript here because it re-runs on every navigation,
    // including the redirect back to /login, which would re-inject the token
    // and trigger an infinite 401 → redirect loop.
    await page.goto("/login");
    await page.evaluate(() => window.localStorage.setItem("jwt", "stale-token"));

    // Navigate to a protected page — AuthContext sees the JWT, fetches /users/me,
    // gets 401, calls logoutUser() which clears localStorage and redirects to /login.
    await page.goto("/conformance-test-runs");

    await expect(page).toHaveURL(/\/login/);

    // The JWT must have been cleared from storage.
    const jwt = await page.evaluate(() => window.localStorage.getItem("jwt"));
    expect(jwt).toBeNull();
  });
});
