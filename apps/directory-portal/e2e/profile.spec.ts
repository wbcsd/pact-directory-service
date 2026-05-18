import { test, expect } from "./fixtures";

test.describe("My Profile", () => {
  // ---------------------------------------------------------------------------
  // View profile — fields are editable inputs, not plain text
  // ---------------------------------------------------------------------------

  test("profile page shows the email address field (disabled input)", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/my-profile");

    // Email is a disabled TextField — its value is set but it's not plain text
    // The label "Email Address" is always visible
    await expect(page.getByText("Email Address")).toBeVisible();
    // The disabled input has the email as its value
    await expect(page.locator("input[disabled]").first()).toBeVisible();
  });

  test("profile page has an editable Full Name field", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/my-profile");

    // The Full Name field is a required textbox
    const nameField = page.getByRole("textbox", { name: "Full Name" });
    await expect(nameField).toBeVisible();
    // Mock profile pre-fills "Test User"
    await expect(nameField).toHaveValue("Test User");
  });

  test("profile page has an editable Organization Name field", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/my-profile");

    const orgField = page.getByRole("textbox", { name: "Organization Name" });
    await expect(orgField).toBeVisible();
    // Mock profile pre-fills "Test Organisation"
    await expect(orgField).toHaveValue("Test Organisation");
  });

  test("profile page shows the My Profile heading", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/my-profile");

    await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Edit profile
  // ---------------------------------------------------------------------------

  test("updating the full name field and saving shows success callout", async ({
    authenticatedPage: page,
  }) => {
    // The form POSTs to /organizations/10/users/1 (not PATCH /users/me)
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:3010/api";
    let saveCalled = false;
    await page.route(`${apiBase}/directory/organizations/10/users/1`, async (route) => {
      if (route.request().method() === "POST") {
        saveCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: 1, fullName: "Updated Name" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/my-profile");

    const nameField = page.getByRole("textbox", { name: "Full Name" });
    await nameField.clear();
    await nameField.fill("Updated Name");

    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByText(/profile updated successfully/i)).toBeVisible({ timeout: 5000 });
    expect(saveCalled).toBe(true);
  });

  test("profile page Save Changes button is visible", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/my-profile");

    await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible();
  });
});

