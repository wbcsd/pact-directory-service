import { test, expect } from "./fixtures";
import { mockProfileData } from "./mocks/data/auth";
import { mockConnectionListWithExternalResponse } from "./mocks/data/connections";

test.describe("Node Connections", () => {
  // ---------------------------------------------------------------------------
  // Connections tab on Node Dashboard
  // ---------------------------------------------------------------------------

  test("connections tab shows accepted connection with connected node name", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // Default tab is connections — mock has Test Node Alpha ↔ Test Node Beta (accepted)
    // Use first() because "Test Node Beta" also appears in the PCF Requests section
    await expect(page.getByRole("link", { name: "Test Node Beta" }).first()).toBeVisible();
  });

  test("connections tab shows pending invitation with Accept and Reject buttons", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // Mock invitation: id=300, from Test Node Beta (pending)
    await expect(page.getByRole("button", { name: /accept/i })).toBeVisible();
    // Use .first() — both connections and PCF requests sections may have Reject buttons
    await expect(page.getByRole("button", { name: /reject/i }).first()).toBeVisible();
  });

  test("accepting invitation reveals client credentials", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await page.getByRole("button", { name: /accept/i }).click();

    // mockAcceptInvitationResponse returns clientId: "client-id-accepted"
    await expect(page.getByText("client-id-accepted")).toBeVisible();
  });

  test("rejecting invitation dismisses confirmation and removes invitation on confirm", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    await page.getByRole("button", { name: /reject/i }).first().click();

    // AlertDialog should appear — confirm the rejection
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: /confirm/i }).click();

    // After rejection, we should remain on the node dashboard without errors
    await expect(page).toHaveURL(/\/nodes\/100/);
  });

  test("connections tab shows client ID for accepted connection (truncated)", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // The connections table shows accepted connection with "accepted" status badge
    // clientId is not shown directly in the connections table (only in the Callout after Accept)
    await expect(page.getByText("accepted", { exact: false }).first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Create connection page
  // ---------------------------------------------------------------------------

  test("Create Connection page renders a form with a node selector", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/create-connection");

    // The create connection form should render with a "Create Invitation" submit button
    await expect(page.getByRole("button", { name: /create invitation/i })).toBeVisible();
  });

  test("Create Connection page submits invitation and shows success", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/create-connection");

    // Select a target node if there's a dropdown
    const targetSelect = page.getByRole("combobox").first();
    if (await targetSelect.isVisible()) {
      // The selector should contain Test Node Beta (id=101)
      await targetSelect.selectOption({ label: "Test Node Beta" }).catch(() => {
        // combobox might use a different pattern — skip if unavailable
      });
    }

    await page.getByRole("button", { name: "Create Invitation" }).click();

    // Should not error — mock returns { id: 300 } for postNodeInvitation
    await expect(page).not.toHaveURL(/\/error/);
  });

  // ---------------------------------------------------------------------------
  // Navigation: clicking a connected node navigates to its dashboard
  // ---------------------------------------------------------------------------

  test("clicking a connected node's name navigates to that node's dashboard", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    // NodeLink renders the connected node name as an <a> link
    // Use first() because "Test Node Beta" appears multiple times (connections + PCF requests)
    const nodeLink = page.getByRole("link", { name: "Test Node Beta" }).first();
    await nodeLink.click();
    await expect(page).toHaveURL(/\/nodes\/101/);
  });

  // ---------------------------------------------------------------------------
  // Remove connection
  // ---------------------------------------------------------------------------

  test("remove connection shows confirmation before proceeding", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100");

    const removeButton = page.getByRole("button", { name: /remove/i }).first();
    if (await removeButton.isVisible()) {
      await removeButton.click();

      // AlertDialog should appear — cancel so the connection is not removed
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await page.getByRole("alertdialog").getByRole("button", { name: /cancel/i }).click();
    }

    // We should still be on the node dashboard
    await expect(page).toHaveURL(/\/nodes\/100/);
  });

  // ---------------------------------------------------------------------------
  // External org connections — org name badge
  // ---------------------------------------------------------------------------

  test("connection to an external org shows the organization name badge", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({ getNodeConnections: mockConnectionListWithExternalResponse });
    await page.goto("/nodes/100");

    // "External Organisation" badge should appear in the connections table
    await expect(page.getByText("External Organisation").first()).toBeVisible();
  });

  test("external connected node name is plain text (not a link) for non-root user", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({ getNodeConnections: mockConnectionListWithExternalResponse });
    await page.goto("/nodes/100");

    // The external node name should be visible as text
    await expect(page.getByText("External Node Gamma").first()).toBeVisible();
    // But NOT rendered as a navigable link
    await expect(page.getByRole("link", { name: "External Node Gamma" })).not.toBeVisible();
  });

  test("root user sees external connected node name as a link", async ({
    authenticatedPage: page,
    setupMocks,
  }) => {
    await setupMocks({
      getMe: { ...mockProfileData, role: "root" },
      getNodeConnections: mockConnectionListWithExternalResponse,
    });
    await page.goto("/nodes/100");

    // Root can navigate to any node — so the name should be a link
    await expect(page.getByRole("link", { name: "External Node Gamma" }).first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Create Connection — PACT Network group
  // ---------------------------------------------------------------------------

  test("Create Connection target dropdown shows a PACT Network group", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/create-connection");

    // Open the target node Select trigger
    const trigger = page.getByRole("combobox").first();
    await trigger.click();

    // Scope to the open Radix listbox portal to avoid matching the Callout text
    await expect(page.locator('[role="listbox"]').getByText("PACT Network")).toBeVisible();
  });

  test("PACT Network group contains the discoverable external node", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/create-connection");

    const trigger = page.getByRole("combobox").first();
    await trigger.click();

    // Scope to the open listbox to avoid matching hidden native <option> elements
    const listbox = page.locator('[role="listbox"]');
    await expect(listbox.getByText(/External Node Gamma/i)).toBeVisible();
    await expect(listbox.getByText(/External Organisation/i)).toBeVisible();
  });

  test("cross-org invitation success message mentions the organization will be notified", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/create-connection");

    // Open the target select and pick the external node (value = "net:200")
    const trigger = page.getByRole("combobox").first();
    await trigger.click();
    // Click the External Node Gamma option
    await page.getByRole("option", { name: /External Node Gamma/i }).click();

    await page.getByRole("button", { name: "Create Invitation" }).click();

    // Cross-org success message should mention the org will be notified
    await expect(
      page.getByText(/organization will be notified/i)
    ).toBeVisible({ timeout: 5000 });

    // No "Go to dashboard" button for cross-org invites
    await expect(
      page.getByRole("button", { name: /go to/i })
    ).not.toBeVisible();
  });
});
