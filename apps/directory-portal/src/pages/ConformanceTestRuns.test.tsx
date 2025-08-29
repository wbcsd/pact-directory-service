// src/pages/ConformanceTestRuns.container.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { proxyWithAuth } from "../utils/auth-fetch";
vi.mock("../utils/auth-fetch", () => ({ proxyWithAuth: vi.fn() }));

// Mock presentational grid to observe props from the container
const gridSpy = vi.fn();
vi.mock("./ConformanceTestRunsGrid", () => ({
  default: (props: any) => {
    gridSpy(props);
    return (
      <div data-testid="grid">
        GRID: runs={props.testRuns?.length ?? 0}
        {props.error ? ` error=${props.error}` : ""}
        {props.isLoading ? " loading" : ""}
      </div>
    );
  },
}));

// Keep SideNav small
vi.mock("../components/SideNav", () => ({
  default: () => <div data-testid="sidenav" />,
}));

// Radix primitives → minimal HTML
vi.mock("@radix-ui/themes", async (orig) => {
  const actual: any = await (orig as any)();
  return {
    ...actual,
    Button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  };
});

// Static asset
vi.mock("../assets/pact-logistics-center-8.png", () => ({
  default: "empty.png",
}));

// Component under test
import ConformanceTestRuns from "./ConformanceTestRuns";

// Helpers
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
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);

const renderWithRouter = (initial = "/runs") =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/runs" element={<ConformanceTestRuns />} />
        <Route path="/conformance-testing" element={<div>Form</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  gridSpy.mockClear();
});

describe("<ConformanceTestRuns /> container", () => {
  it("fetches all runs on mount when no query; renders header + grid", async () => {
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(
      ok({ testRuns: [mkRun()] })
    );

    renderWithRouter("/runs");

    // Header should show after loading/error are false
    await screen.findByTestId("grid");
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Press enter to search/i)
    ).toBeInTheDocument();

    expect(proxyWithAuth).toHaveBeenCalledWith("/test-runs");
    expect(gridSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        testRuns: expect.any(Array),
        isLoading: false,
        error: null,
      })
    );
  });

  it("prefills input and fetches using ?q=acme on mount", async () => {
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(
      ok({ testRuns: [mkRun()] })
    );

    renderWithRouter("/runs?q=acme");

    const input = await screen.findByPlaceholderText(/Press enter to search/i);
    expect((input as HTMLInputElement).value).toBe("acme");
    expect(proxyWithAuth).toHaveBeenCalledWith("/test-runs?query=acme");
    expect(screen.getByTestId("grid")).toBeInTheDocument();
  });

  it("Enter (≥4 chars) updates URL -> triggers fetch with query -> grid shows filtered runs", async () => {
    // initial fetch (no query)
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(
      ok({ testRuns: [mkRun({ companyName: "Globex" })] })
    );
    // after search
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(
      ok({ testRuns: [mkRun({ companyName: "Acme" })] })
    );

    renderWithRouter("/runs");

    await screen.findByTestId("grid");
    const input = screen.getByPlaceholderText(/Press enter to search/i);
    await userEvent.clear(input);
    await userEvent.type(input, "acme");
    fireEvent.keyUp(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() =>
      expect(proxyWithAuth).toHaveBeenLastCalledWith("/test-runs?query=acme")
    );
    // Our mock grid prints length; ensure it re-rendered
    expect(screen.getByTestId("grid")).toHaveTextContent(/runs=1/);
  });

  it("Backspace to empty clears search and refetches all", async () => {
    // mount with query -> empty list
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(ok({ testRuns: [] }));
    // after clearing -> all
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(
      ok({ testRuns: [mkRun({ companyName: "All" })] })
    );

    renderWithRouter("/runs?q=acme");

    const input = await screen.findByPlaceholderText(/Press enter to search/i);
    // Clear to empty
    await userEvent.clear(input);
    fireEvent.keyUp(input, {
      key: "Backspace",
      code: "Backspace",
      charCode: 8,
    });

    await waitFor(() =>
      expect(proxyWithAuth).toHaveBeenLastCalledWith("/test-runs")
    );
    expect(screen.getByTestId("grid")).toHaveTextContent(/runs=1/);
  });

  it("clear (×) button clears input + URL and refetches all", async () => {
    // mount with query
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(
      ok({ testRuns: [mkRun()] })
    );
    // after clear -> all
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(
      ok({ testRuns: [mkRun(), mkRun({ testId: "zz" })] })
    );

    renderWithRouter("/runs?q=acme");

    const input = await screen.findByPlaceholderText(/Press enter to search/i);
    const clearBtn = screen.getByRole("button", { name: /Clear search/i });
    await userEvent.click(clearBtn);

    // input becomes empty; grid shows 2 runs now
    await waitFor(() =>
      expect(
        (screen.getByPlaceholderText(/Press enter/i) as HTMLInputElement).value
      ).toBe("")
    );
    expect(proxyWithAuth).toHaveBeenLastCalledWith("/test-runs");
    expect(screen.getByTestId("grid")).toHaveTextContent(/runs=2/);
  });

  it("when searching yields no results, shows 'No results' empty state (grid hidden); header still visible", async () => {
    // mount with query -> empty
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(ok({ testRuns: [] }));

    renderWithRouter("/runs?q=acme");

    // header is rendered (not loading, no error)
    expect(await screen.findByText("Overview")).toBeInTheDocument();
    expect(screen.getByText(/No results for/i)).toBeInTheDocument();
    // Grid is not rendered in this branch
    expect(screen.queryByTestId("grid")).not.toBeInTheDocument();
  });

  it("Run Tests button disables when there are zero runs", async () => {
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(ok({ testRuns: [] }));
    renderWithRouter("/runs");

    await screen.findByText("Overview");
    const btn = screen.getByRole("button", { name: /Run Tests/i });
    expect(btn).toBeDisabled();
  });

  it("Run Tests button enabled when there are runs", async () => {
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(
      ok({ testRuns: [mkRun()] })
    );
    renderWithRouter("/runs");

    await screen.findByText("Overview");
    const btn = screen.getByRole("button", { name: /Run Tests/i });
    expect(btn).not.toBeDisabled();
  });

  it("passes error to grid and hides header while loading/error is true", async () => {
    // first resolve to an API error payload
    (proxyWithAuth as vi.Mock).mockResolvedValueOnce(ok({ error: "Nope" }));

    renderWithRouter("/runs");

    // Header is hidden when error is set (container: Boolean(isLoading||error) === false)
    await waitFor(() => {
      // grid still renders (mock) because container delegates error handling to it
      expect(screen.getByTestId("grid")).toBeInTheDocument();
      expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    });

    // our mock grid printed "error=Nope"
    expect(screen.getByTestId("grid")).toHaveTextContent(/error=Nope/);
  });
});
