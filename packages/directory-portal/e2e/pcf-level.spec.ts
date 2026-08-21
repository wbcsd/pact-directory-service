import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Verifies the PCF Usability Level badge climbs from "Incomplete" through
 * Level 1 → 2 → 3 as the Add Product Footprint form is progressively filled in.
 *
 * The badge in the form panel carries data-testid="pcf-level-badge" and its
 * text is the achieved level label ("Incomplete" / "Level 1" / …).
 */
test.describe("PCF Usability Level — live badge on the Add form", () => {
  /** Add a value to a TagInput (custom component) by typing and pressing Enter. */
  async function addTag(page: Page, placeholder: string, value: string) {
    const input = page.getByPlaceholder(placeholder);
    await input.fill(value);
    await input.press("Enter");
  }

  /** Fill the Level 1 (Indicative) attributes: core identity, unit, cradle-to-gate value, reference period, geography. */
  async function fillLevel1(page: Page) {
    await page.getByLabel(/product trade name/i).fill("E2E Widget");
    await page.getByLabel(/product description/i).fill("An end-to-end test widget");
    await addTag(page, "urn:gtin:4012345678901", "urn:gtin:4012345678901");
    await page.getByLabel(/pcf excl\. biogenic uptake/i).fill("5.14");
    await page.getByLabel(/declared unit amount/i).fill("1.0");
    await page.getByLabel(/mass per declared unit/i).fill("1.0");
    await page.getByLabel(/reference period start/i).fill("2024-01-01");
    await page.getByLabel(/reference period end/i).fill("2024-12-31");
    await page.getByLabel(/country \(iso 3166-1/i).fill("DE");
  }

  /** Fill the Level 2 (Consistent) attributes: biogenic-inclusive value, PDS, secondary emission factor sources. */
  async function fillLevel2(page: Page) {
    await page.getByLabel(/pcf incl\. biogenic uptake/i).fill("4.90");
    await page.getByLabel(/primary data share/i).fill("60");
    // Secondary emission factor sources (repeatable name/version editor).
    await page.getByRole("button", { name: /add source/i }).click();
    await page.getByPlaceholder("Database name (e.g. ecoinvent)").fill("ecoinvent");
    await page.getByPlaceholder("Version (e.g. 3.9.1)").fill("3.9.1");
  }

  /** Fill the Level 3 (Methodologically Complete) attributes: remaining SHALL fields + transparency. */
  async function fillLevel3(page: Page) {
    await page.getByLabel(/company name/i).fill("E2E Test Company");
    await addTag(page, "urn:company:example:company1", "urn:company:example:co1");
    await page.getByLabel(/fossil ghg emissions/i).fill("3.20");
    await page.getByLabel(/fossil carbon content/i).fill("0.50");
    // Keep exemptions <= 3% so the exemption description is not required.
    await page.getByLabel(/exempted emissions \(%\)/i).fill("2.0");
    await page.getByLabel(/allocation rules description/i).fill("Mass-based allocation");
    await page.getByLabel(/boundary processes description/i).fill("Cradle-to-gate manufacturing");
  }

  test("badge progresses Incomplete → Level 1 → Level 2 → Level 3", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/footprints/new");

    const badge = page.getByTestId("pcf-level-badge");

    // A brand-new form has core identity fields empty -> below Level 1.
    await expect(badge).toHaveText("Incomplete");

    await fillLevel1(page);
    await expect(badge).toHaveText("Level 1");

    await fillLevel2(page);
    await expect(badge).toHaveText("Level 2");

    await fillLevel3(page);
    await expect(badge).toHaveText("Level 3");
  });

  test("level does not advance while a lower tier is incomplete", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/nodes/100/footprints/new");

    const badge = page.getByTestId("pcf-level-badge");
    await expect(badge).toHaveText("Incomplete");

    // Fill Level 2 and Level 3 attributes but leave a Level 1 attribute (geography) blank.
    await page.getByLabel(/product trade name/i).fill("E2E Widget");
    await page.getByLabel(/product description/i).fill("An end-to-end test widget");
    await addTag(page, "urn:gtin:4012345678901", "urn:gtin:4012345678901");
    await page.getByLabel(/pcf excl\. biogenic uptake/i).fill("5.14");
    await page.getByLabel(/declared unit amount/i).fill("1.0");
    await page.getByLabel(/mass per declared unit/i).fill("1.0");
    await page.getByLabel(/reference period start/i).fill("2024-01-01");
    await page.getByLabel(/reference period end/i).fill("2024-12-31");
    // Geography intentionally left blank -> Level 1 incomplete.

    await fillLevel2(page);
    await fillLevel3(page);

    // A Level 1 gap caps the level even though Level 2/3 fields are populated.
    await expect(badge).toHaveText("Incomplete");

    // Filling the missing Level 1 attribute unlocks the full Level 3.
    await page.getByLabel(/country \(iso 3166-1/i).fill("DE");
    await expect(badge).toHaveText("Level 3");
  });
});
