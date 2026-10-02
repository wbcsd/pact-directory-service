import { test, expect } from "./fixtures";

test.describe("Data Model Extensions", () => {
  test("list shows registry columns and entries", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/data-model-extensions");

    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Spec Version" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Author" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Nodes" })).toBeVisible();

    await expect(page.getByText("PACT Primary Data Share")).toBeVisible();
    await expect(page.getByText("ISO 14083 Shipment")).toBeVisible();
  });

  test("status is rendered as a badge", async ({ authenticatedPage: page }) => {
    await page.goto("/data-model-extensions");

    await expect(page.getByText("Active", { exact: true })).toBeVisible();
    await expect(page.getByText("Deprecated", { exact: true })).toBeVisible();
  });

  test("add button opens the create slide-over", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/data-model-extensions");

    await page.getByRole("button", { name: /add extension/i }).click();

    await expect(page.getByText(/add data model extension/i)).toBeVisible();
    await expect(page.getByPlaceholder(/schema\.json/i)).toBeVisible();
  });

  test("edit slide-over pre-fills the extension fields", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/data-model-extensions");

    await page.getByRole("button", { name: /edit PACT Primary Data Share/i }).click();

    await expect(page.getByText(/edit data model extension/i)).toBeVisible();
    await expect(
      page.getByPlaceholder("e.g. PACT Primary Data Share")
    ).toHaveValue("PACT Primary Data Share");
  });

  test("fetch schema populates the schema preview", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/data-model-extensions");

    await page.getByRole("button", { name: /add extension/i }).click();
    await page
      .getByPlaceholder(/schema\.json/i)
      .fill("https://catalog.carbon-transparency.com/pds/1.0.0/schema.json");
    await page.getByRole("button", { name: /fetch schema/i }).click();

    await expect(page.getByText(/schema retrieved successfully/i)).toBeVisible();
    await expect(
      page.getByText(/primaryDataShareScope2/)
    ).toBeVisible();
  });

  test("deleting an extension asks for confirmation", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/data-model-extensions");

    await page.getByRole("button", { name: /delete ISO 14083 Shipment/i }).click();

    await expect(
      page.getByText(/delete "ISO 14083 Shipment"\?/i)
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("hides management actions without the manage policy", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({
      getMe: {
        id: 1,
        organizationId: 10,
        organizationName: "Test Organisation",
        organizationIdentifier: "TEST-ORG-001",
        organizationDescription: "A test organisation for e2e testing",
        solutionApiUrl: null,
        fullName: "Test User",
        email: "test@example.com",
        role: "user",
        status: "enabled",
        policies: ["view-data-model-extensions"],
      },
    });

    await page.goto("/data-model-extensions");

    await expect(page.getByText("PACT Primary Data Share")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /add extension/i })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /delete PACT Primary Data Share/i })
    ).toHaveCount(0);
  });
});

test.describe("Node data model extensions", () => {
  test("node form offers the registered extensions in a multi-select", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    await page.getByRole("button", { name: /add node/i }).click();

    const multiSelect = page.getByRole("button", {
      name: "Data Model Extensions",
    });
    await expect(multiSelect).toBeVisible();
    await multiSelect.click();

    await expect(
      page.getByText("PACT Primary Data Share (1.0.0)")
    ).toBeVisible();
    await expect(page.getByText("ISO 14083 Shipment (1.0.0)")).toBeVisible();
  });

  test("multi-select filters options by search term", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    await page.getByRole("button", { name: /add node/i }).click();
    await page.getByRole("button", { name: "Data Model Extensions" }).click();
    await page.getByPlaceholder("Search extensions…").fill("shipment");

    await expect(page.getByText("ISO 14083 Shipment (1.0.0)")).toBeVisible();
    await expect(
      page.getByText("PACT Primary Data Share (1.0.0)")
    ).toHaveCount(0);
  });

  test("selecting an extension shows it as a badge on the trigger", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes");

    await page.getByRole("button", { name: /add node/i }).click();
    const trigger = page.getByRole("button", { name: "Data Model Extensions" });
    await trigger.click();

    await page
      .getByRole("checkbox", { name: /PACT Primary Data Share/i })
      .check();
    await page.keyboard.press("Escape");

    await expect(trigger).toContainText("PACT Primary Data Share (1.0.0)");
  });
});
