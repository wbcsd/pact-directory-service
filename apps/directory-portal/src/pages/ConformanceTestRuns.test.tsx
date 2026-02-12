import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ConformanceTestRuns from "./ConformanceTestRuns";
import * as AuthContext from "../contexts/AuthContext";
import * as authFetch from "../utils/auth-fetch";

let lastTableProps: any = null;

vi.mock("@radix-ui/themes", () => ({
  Button: ({ children, onClick, disabled, type }: any) => (
    <button onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  ),
}));

vi.mock("../components/StatusBadge", () => ({
  default: ({ status }: any) => <span data-testid="status-badge">{status}</span>,
}));

vi.mock("../layouts/GridPageLayout", () => ({
  default: ({ title, subtitle, actions, children }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{actions}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("../components/SearchableDataTable", () => ({
  default: (props: any) => {
    lastTableProps = props;
    return <div data-testid="searchable-table" />;
  },
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockTestRuns = [
  {
    testRunId: "12345678-1234-1234-1234-123456789012",
    techSpecVersion: "v1.0.0",
    timestamp: "2025-01-15T14:30:00Z",
    organizationName: "Test Org",
    adminEmail: "admin@test.com",
    passingPercentage: 95,
    status: "PASS" as const,
  },
  {
    testRunId: "87654321-4321-4321-4321-210987654321",
    techSpecVersion: "v1.1.0",
    timestamp: "2025-02-20T10:15:00Z",
    organizationName: "Another Org",
    adminEmail: "user@another.com",
    passingPercentage: 60,
    status: "FAIL" as const,
  },
];

const mockProfileData = {
  id: 1,
  status: 'enabled',
  role: "user",
  email: "user@test.com",
  name: "Test User",
  fullName: "Test User",
  organizationId: 1,
  organizationName: "Test Org",
  organizationIdentifier: "test-org",
  organizationDescription: "A test organization",
  solutionApiUrl: "https://api.test.com",
  registrationCode: "REG123",
  clientId: "client-123",
  clientSecret: "secret-xyz",
  networkKey: "network-key",
  policies: [],
};

describe("ConformanceTestRuns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastTableProps = null;
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      profileData: mockProfileData,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refreshProfileData: vi.fn(),
    });
  });

  const renderWithRouter = (initialEntries: string[] = ["/"]) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <ConformanceTestRuns />
      </MemoryRouter>
    );
  };

  it("renders title, subtitle, and Run Tests action", () => {
    renderWithRouter();

    expect(screen.getByText("Conformance Tests")).toBeInTheDocument();
    expect(
      screen.getByText("Showing runs from all conformance tests")
    ).toBeInTheDocument();
    expect(screen.getByText("Run Tests")).toBeInTheDocument();
  });

  it("navigates to conformance testing when Run Tests clicked", () => {
    renderWithRouter();
    fireEvent.click(screen.getByText("Run Tests"));
    expect(mockNavigate).toHaveBeenCalledWith("/conformance-testing");
  });

  it("passes expected props to SearchableDataTable", () => {
    renderWithRouter();

    expect(lastTableProps).toBeTruthy();
    expect(lastTableProps.searchPlaceholder).toBe(
      "Search by organization name, email address or user name"
    );
    expect(lastTableProps.idColumnName).toBe("testRunId");
    expect(Array.isArray(lastTableProps.columns)).toBe(true);
  });

  it("uses user columns by default", () => {
    renderWithRouter();
    expect(lastTableProps.columns).toHaveLength(4);
  });

  it("includes admin columns for administrator role", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      profileData: { ...mockProfileData, role: "administrator" },
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      refreshProfileData: vi.fn(),
    });

    renderWithRouter();
    expect(lastTableProps.columns).toHaveLength(6);
  });

  it("fetchData builds URL with page and pageSize", async () => {
    vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: mockTestRuns,
        pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
      }),
    } as Response);

    renderWithRouter();

    await lastTableProps.fetchData({ page: 1, pageSize: 10 });
    expect(authFetch.proxyWithAuth).toHaveBeenCalledWith(
      "/test-runs?page=1&pageSize=10"
    );
  });

  it("fetchData includes search when provided", async () => {
    vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: mockTestRuns,
        pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
      }),
    } as Response);

    renderWithRouter();

    await lastTableProps.fetchData({ page: 1, pageSize: 10, search: "test" });
    expect(authFetch.proxyWithAuth).toHaveBeenCalledWith(
      "/test-runs?page=1&pageSize=10&search=test"
    );
  });

  it("fetchData throws when response not ok", async () => {
    vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    renderWithRouter();

    await expect(
      lastTableProps.fetchData({ page: 1, pageSize: 10 })
    ).rejects.toThrow("Failed to fetch test runs");
  });

  it("fetchData throws when API returns error", async () => {
    vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
      ok: true,
      json: async () => ({ error: "API Error" }),
    } as Response);

    renderWithRouter();

    await expect(
      lastTableProps.fetchData({ page: 1, pageSize: 10 })
    ).rejects.toThrow("API Error");
  });

  it("fetchData returns result on success", async () => {
    const result = {
      data: mockTestRuns,
      pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
    };
    vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
      ok: true,
      json: async () => result,
    } as Response);

    renderWithRouter();

    await expect(
      lastTableProps.fetchData({ page: 1, pageSize: 10 })
    ).resolves.toEqual(result);
  });
});