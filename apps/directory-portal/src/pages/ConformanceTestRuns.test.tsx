// ConformanceTestRuns.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest"; // or jest if you're using Jest
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../utils/auth-fetch", () => ({
  proxyWithAuth: vi.fn(),
}));

// Stub the auth context so we can control the role
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ profileData: { role: "administrator" } }),
}));

// Light stubs for presentational components that don't affect behavior
vi.mock("../components/SideNav", () => ({
  default: () => <div data-testid="sidenav" />,
}));
vi.mock("../components/StatusBadge", () => ({
  default: ({ status }: { status: string }) => <span>{status}</span>,
}));
vi.mock("../components/LoadingSpinner", () => ({
  default: () => <div>Loading…</div>,
}));

// If your test runner doesn't already mock static assets, add this:
vi.mock("../assets/pact-logistics-center-8.png", () => ({
  default: "empty.png",
}));

// If Radix CSS-in-JS shenanigans bother tests, you can noop the theme
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

import { proxyWithAuth } from "../utils/auth-fetch";
import ConformanceTestRuns from "./ConformanceTestRuns";

// ------- helpers -------
function renderWithRouter(path = "/runs", initialEntries?: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries ?? [path]}>
      <Routes>
        <Route path="/runs" element={<ConformanceTestRuns />} />
        {/* detail page dummy to allow <NavLink /> to navigate if needed */}
        <Route path="/conformance-test-result" element={<div>Detail</div>} />
        <Route path="/conformance-testing" element={<div>Form</div>} />
      </Routes>
    </MemoryRouter>
  );
}

type Run = {
  testId: string;
  techSpecVersion: string;
  timestamp: string;
  companyName: string;
  adminEmail: string;
  passingPercentage: number;
  status: "PASS" | "FAIL" | "PENDING";
};

const mkRun = (over: Partial<Run> = {}): Run => ({
  testId: "abcd1234efgh5678",
  techSpecVersion: "1.0.0",
  timestamp: new Date("2025-01-01T10:00:00Z").toISOString(),
  companyName: "Acme Corp",
  adminEmail: "admin@acme.com",
  passingPercentage: 100,
  status: "PASS",
  ...over,
});

const ok = (body: any) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response);

// Reset mock between tests
beforeEach(() => {
  vi.clearAllMocks();
});

// ------- tests -------
describe("<ConformanceTestRuns />", () => {
  it("fetches all runs on mount when there is no query and renders rows", async () => {
    (proxyWithAuth as vi.Mock).mockImplementation((url: string) => {
      expect(url).toBe("/test-runs"); // no ?query=
      return ok({
        testRuns: [
          mkRun(),
          mkRun({ testId: "zzzz9999yyyy8888", companyName: "Globex" }),
        ],
      });
    });

    renderWithRouter("/runs");

    // Initially shows loading
    expect(screen.getByText(/Loading…/i)).toBeInTheDocument();

    // Table renders with admin columns "Company" and "Email"
    const companyHeader = await screen.findByRole("columnheader", {
      name: /company/i,
    });
    expect(companyHeader).toBeInTheDocument();

    // Two rows rendered
    const rows = screen.getAllByRole("row");
    // rows[0] is header; ensure at least one data row contains Acme
    const acmeRow = screen.getByText("Acme Corp").closest("tr")!;
    expect(within(acmeRow).getByText(/PASS/i)).toBeInTheDocument();

    // Search input is empty when no query present
    const input = screen.getByPlaceholderText(
      /Press enter to search/i
    ) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("reads ?q= from URL, pre-fills input, and fetches filtered runs", async () => {
    (proxyWithAuth as vi.Mock).mockImplementation((url: string) => {
      expect(url).toBe("/test-runs?query=acme");
      return ok({ testRuns: [mkRun({ companyName: "Acme Corp" })] });
    });

    renderWithRouter("/runs?q=acme", ["/runs?q=acme"]);

    const input = await screen.findByPlaceholderText(/Press enter to search/i);
    expect((input as HTMLInputElement).value).toBe("acme");

    // Row for Acme is shown
    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
  });

  it("on Enter (≥4 chars) updates URL and refetches with the query", async () => {
    // First mount: no query
    (proxyWithAuth as vi.Mock).mockImplementationOnce((url: string) => {
      expect(url).toBe("/test-runs");
      return ok({ testRuns: [mkRun({ companyName: "Globex" })] });
    });

    // After search: with ?query=acme
    (proxyWithAuth as vi.Mock).mockImplementationOnce((url: string) => {
      expect(url).toBe("/test-runs?query=acme");
      return ok({
        testRuns: [mkRun({ companyName: "Acme Corp", testId: "acme0001" })],
      });
    });

    renderWithRouter("/runs");

    // Wait for initial data
    await screen.findByText("Globex");

    const input = screen.getByPlaceholderText(/Press enter to search/i);
    await userEvent.clear(input);
    await userEvent.type(input, "acme");
    fireEvent.keyUp(input, { key: "Enter", code: "Enter", charCode: 13 });

    // Should render the filtered result
    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();

    // Admin columns still present
    expect(
      screen.getByRole("columnheader", { name: /email/i })
    ).toBeInTheDocument();
  });

  it("clears query on empty Enter and shows all again", async () => {
    // Mount with a query first
    (proxyWithAuth as vi.Mock).mockImplementationOnce((url: string) => {
      expect(url).toBe("/test-runs?query=acme");
      return ok({ testRuns: [mkRun({ companyName: "Acme Corp" })] });
    });

    // After clearing, should fetch all
    (proxyWithAuth as vi.Mock).mockImplementationOnce((url: string) => {
      expect(url).toBe("/test-runs");
      return ok({ testRuns: [mkRun({ companyName: "Globex" })] });
    });

    renderWithRouter("/runs?q=acme", ["/runs?q=acme"]);

    const input = await screen.findByPlaceholderText(/Press enter to search/i);
    expect((input as HTMLInputElement).value).toBe("acme");

    // Clear and press Enter
    await userEvent.clear(input);
    fireEvent.keyUp(input, { key: "Enter", code: "Enter", charCode: 13 });

    // Now shows Globex (all runs)
    expect(await screen.findByText("Globex")).toBeInTheDocument();
  });

  it("renders empty state when no runs returned", async () => {
    (proxyWithAuth as vi.Mock).mockResolvedValue(ok({ testRuns: [] }));
    renderWithRouter("/runs");

    await waitFor(() => {
      expect(
        screen.getByText(/You currently have no tests/i)
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /Run Tests/i })
    ).toBeInTheDocument();
  });

  it("shows error callout when API returns error", async () => {
    (proxyWithAuth as vi.Mock).mockResolvedValue(ok({ error: "Nope" }));

    renderWithRouter("/runs");

    expect(
      await screen.findByText("Conformance Test Runs")
    ).toBeInTheDocument();
    expect(screen.getByText("Nope")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Back to Testing Form/i })
    ).toBeInTheDocument();
  });
});
