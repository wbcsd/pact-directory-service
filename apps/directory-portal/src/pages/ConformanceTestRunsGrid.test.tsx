// src/pages/ConformanceTestRunsGrid.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ConformanceTestRunsGrid from "./ConformanceTestRunsGrid";

// ---- Mocks for leaf components/assets ----
vi.mock("../components/LoadingSpinner", () => ({
  default: () => <div>Loading…</div>,
}));
vi.mock("../components/StatusBadge", () => ({
  default: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));
vi.mock("../assets/pact-logistics-center-8.png", () => ({
  default: "empty.png",
}));

// Optionally noop Radix primitives if they cause noise in your env
vi.mock("@radix-ui/themes", async (orig) => {
  const actual: any = await (orig as any)();
  return {
    ...actual,
    Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
    Callout: {
      Root: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      Icon: ({ children }: any) => <span>{children}</span>,
      Text: ({ children }: any) => <span>{children}</span>,
    },
  };
});

// ---- Helpers / types ----
type Run = {
  testId: string;
  techSpecVersion: string;
  timestamp: string;
  organizationName: string;
  adminEmail: string;
  passingPercentage: number;
  status: "PASS" | "FAIL" | "PENDING";
};

const mkRun = (over: Partial<Run> = {}): Run => ({
  testId: "abcd1234efgh5678",
  techSpecVersion: "1.0.0",
  timestamp: new Date("2025-01-01T10:00:00Z").toISOString(),
  organizationName: "Acme Corp",
  adminEmail: "admin@acme.com",
  passingPercentage: 100,
  status: "PASS",
  ...over,
});

function renderGrid(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={["/runs"]}>
      <Routes>
        <Route path="/runs" element={ui} />
        <Route path="/conformance-testing" element={<div>Form</div>} />
        <Route path="/conformance-test-result" element={<div>Detail</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("<ConformanceTestRunsGrid />", () => {
  it("shows spinner while loading", () => {
    const navigate = vi.fn();
    renderGrid(
      <ConformanceTestRunsGrid
        testRuns={[]}
        profileData={null}
        navigate={navigate as any}
        error={null}
        isLoading={true}
      />
    );

    expect(screen.getByText(/Loading…/i)).toBeInTheDocument();
  });

  it("shows error callout and back button navigates", async () => {
    const navigate = vi.fn();
    renderGrid(
      <ConformanceTestRunsGrid
        testRuns={[]}
        profileData={null}
        navigate={navigate as any}
        error="Boom"
        isLoading={false}
      />
    );

    expect(screen.getByText("Conformance Test Runs")).toBeInTheDocument();
    expect(screen.getByText("Boom")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Back to Testing Form/i })
    );
    expect(navigate).toHaveBeenCalledWith("/conformance-testing");
  });

  it("renders empty state when no runs and navigate button works", async () => {
    const navigate = vi.fn();
    renderGrid(
      <ConformanceTestRunsGrid
        testRuns={[]}
        profileData={null}
        navigate={navigate as any}
        error={null}
        isLoading={false}
      />
    );

    expect(
      screen.getByText(/You currently have no tests/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /No tests yet/i })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Run Tests/i }));
    expect(navigate).toHaveBeenCalledWith("/conformance-testing");
  });

  it("renders table with admin columns (Organization, Email)", () => {
    const navigate = vi.fn();
    renderGrid(
      <ConformanceTestRunsGrid
        testRuns={[
          mkRun(),
          mkRun({ testId: "zzzz9999yyyy8888", organizationName: "Globex" }),
        ]}
        profileData={{ role: "administrator" } as any}
        navigate={navigate as any}
        error={null}
        isLoading={false}
      />
    );

    // Headers
    expect(
      screen.getByRole("columnheader", { name: /Test Run ID/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Organization/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Email/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Status/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Version/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Run Date\/Time CET/i })
    ).toBeInTheDocument();

    // Row content
    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    expect(within(acmeRow).getByText("admin@acme.com")).toBeInTheDocument();
    expect(within(acmeRow).getByTestId("status-badge")).toHaveTextContent(
      "PASS"
    );

    // Link should display first 8 chars of testId
    expect(
      within(acmeRow).getByRole("link", { name: "abcd1234" })
    ).toHaveAttribute(
      "href",
      expect.stringContaining("testRunId=abcd1234efgh5678")
    );

    // Date format includes the month (English locale) and year; avoid timezone flakiness
    expect(within(acmeRow).getByText(/January/i)).toBeInTheDocument();
    expect(within(acmeRow).getByText(/2025/)).toBeInTheDocument();
  });

  it("renders table without admin columns for non-admin", () => {
    const navigate = vi.fn();
    renderGrid(
      <ConformanceTestRunsGrid
        testRuns={[mkRun()]}
        profileData={{ role: "user" } as any}
        navigate={navigate as any}
        error={null}
        isLoading={false}
      />
    );

    // Organization/Email headers should NOT exist
    expect(
      screen.queryByRole("columnheader", { name: /Organization/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /Email/i })
    ).not.toBeInTheDocument();

    // Still renders the other standard headers
    expect(
      screen.getByRole("columnheader", { name: /Status/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Version/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Run Date\/Time CET/i })
    ).toBeInTheDocument();

    // Row does not include admin-only cells
    const row = screen.getByRole("link", { name: "abcd1234" }).closest("tr")!;
    expect(within(row).queryByText("Acme Corp")).not.toBeInTheDocument();
    expect(within(row).queryByText("admin@acme.com")).not.toBeInTheDocument();
  });
});
