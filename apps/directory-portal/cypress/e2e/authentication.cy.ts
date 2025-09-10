describe("smoke test", () => {
  beforeEach(() => {
    cy.visit("http://localhost:5173/login");
    cy.get('[data-testid="login-email"]').type("test@example.com");
    cy.get('[data-testid="login-password"]').type("testpassword");
    cy.get('[data-testid="login-submit"]').click();
  });

  it("logs in succesfully and redirect to conformance test runs", () => {
    cy.url().should("include", "conformance-test-runs");
  });

  it("can access a test run", () => {
    cy.get("a[href*='2b7cfe28']").click();
    cy.url().should("include", "2b7cfe28");
  });

  it("can access a test case detail", () => {
    cy.get("table").should("exist");
    cy.get("a[href*='conformance-test-result']").first().click({ force: true });
    cy.url().should("include", "conformance-test-result");
    cy.get("td[class*='clickable']").first().click();
    cy.get("a[href*='docs.carbon-transparency.org']").should("exist");
  });
});
