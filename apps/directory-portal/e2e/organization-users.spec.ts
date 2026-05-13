import { test, expect } from "./fixtures";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:3010/api";

test.describe("Organization Users — Add User", () => {
  test("opens the Add User panel and successfully creates a new user", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/organization/users");

    // Page heading and table should be visible
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    // Click the Add User button in the page header actions
    await page.getByRole("button", { name: "Add User" }).click();

    // The slide-over panel opens with the Create User heading
    await expect(page.getByRole("heading", { name: "Create User" })).toBeVisible();

    // Fill in the form fields
    await page.getByLabel("Full Name").fill("Jane Smith");
    await page.getByLabel("Email Address").fill("jane.smith@example.com");

    // Submit — the default mock (postOrgUser → mockUserDetail) returns 200
    await page.getByRole("button", { name: "Create User" }).click();

    // Success callout appears inside the panel
    await expect(page.getByText("User created successfully!")).toBeVisible();
  });

  test("shows a validation error when required fields are empty", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/organization/users");
    await page.getByRole("button", { name: "Add User" }).click();

    await expect(page.getByRole("heading", { name: "Create User" })).toBeVisible();

    // Submit without filling anything in
    await page.getByRole("button", { name: "Create User" }).click();

    // Radix Form validation messages for required fields
    await expect(page.getByText("Full Name is required")).toBeVisible();
    await expect(page.getByText("Email Address is required")).toBeVisible();
  });

  test("shows an error callout when the API returns an error", async ({
    authenticatedPage: page,
  }) => {
    // Use page.route() directly so we can return a non-200 status.
    // MockOverrides always fulfills at 200, so response.ok would be true
    // and UserForm would treat it as a success — we need a real 4xx here.
    await page.route(`${apiBase}/directory/organizations/*/users`, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ message: "A user with this email already exists." }),
        });
      }
      return route.fallback();
    });

    await page.goto("/organization/users");
    await page.getByRole("button", { name: "Add User" }).click();

    await page.getByLabel("Full Name").fill("Jane Smith");
    await page.getByLabel("Email Address").fill("jane.smith@example.com");
    await page.getByRole("button", { name: "Create User" }).click();

    await expect(
      page.getByText("A user with this email already exists.")
    ).toBeVisible();
  });

  test("closes the panel without saving when Cancel is clicked", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/organization/users");
    await page.getByRole("button", { name: "Add User" }).click();

    await expect(page.getByRole("heading", { name: "Create User" })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();

    // Panel should no longer be visible
    await expect(page.getByRole("heading", { name: "Create User" })).not.toBeVisible();
  });
});
