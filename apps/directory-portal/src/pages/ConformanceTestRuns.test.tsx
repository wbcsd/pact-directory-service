import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ConformanceTestRuns from "./ConformanceTestRuns";
import * as AuthContext from "../contexts/AuthContext";
import * as authFetch from "../utils/auth-fetch";

// Mock dependencies
vi.mock("@radix-ui/themes", () => ({
  Button: ({ children, onClick, disabled, type }: any) => (
    <button onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  ),
}));

vi.mock("../components/SideNav", () => ({
  default: () => <div data-testid="side-nav">SideNav</div>,
}));

vi.mock("./ConformanceTestRunsGrid", () => ({
  default: ({ testRuns, navigate, profileData, isLoading, error }: any) => (
    <div data-testid="conformance-grid">
      <div data-testid="grid-test-runs-count">{testRuns.length}</div>
      <div data-testid="grid-loading">{isLoading.toString()}</div>
      <div data-testid="grid-error">{error}</div>
      <div data-testid="grid-has-profile">
        {profileData ? "true" : "false"}
      </div>
      <div data-testid="grid-has-navigate">
        {navigate ? "true" : "false"}
      </div>
    </div>
  ),
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

  describe("initial render", () => {
    it("renders the component with sidebar and main content", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ testRuns: mockTestRuns }),
      } as Response);

      renderWithRouter();

      expect(screen.getByTestId("side-nav")).toBeInTheDocument();
      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(
        screen.getByText("Showing runs from all conformance tests")
      ).toBeInTheDocument();
    });

    it("renders search input", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ testRuns: [] }),
      } as Response);

      renderWithRouter();

      const searchInput = screen.getByPlaceholderText(
        /press enter to search/i
      );
      expect(searchInput).toBeInTheDocument();
    });

    it("renders Run Tests button", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ testRuns: mockTestRuns }),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Run Tests")).toBeInTheDocument();
      });
    });
  });

  describe("data fetching", () => {
    it("fetches test runs on mount", async () => {
      const proxyWithAuthSpy = vi
        .spyOn(authFetch, "proxyWithAuth")
        .mockResolvedValue({
          ok: true,
          json: async () => ({ testRuns: mockTestRuns }),
        } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(proxyWithAuthSpy).toHaveBeenCalledWith(
          "/test-runs?page=1&pageSize=10"
        );
      });
    });

    it("displays loading state initially", () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockImplementation(
        () =>
          new Promise(() => {}) // Never resolves to keep loading state
      );

      renderWithRouter();

      expect(screen.getByTestId("grid-loading")).toHaveTextContent("true");
    });

    it("displays test runs after successful fetch", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockTestRuns }),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId("grid-loading")).toHaveTextContent("false");
      });

      await waitFor(() => {
        expect(screen.getByTestId("grid-test-runs-count")).toHaveTextContent(
          "2"
        );
      });
    });

    it("displays error message on fetch failure", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: false,
        json: async () => ({}),
      } as Response);

      renderWithRouter();
    });

    it("handles API error response", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ error: "API Error" }),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId("grid-error")).toHaveTextContent(
          "API Error"
        );
      });
    });

    it("handles network errors", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockRejectedValue(
        new Error("Network error")
      );
      vi.spyOn(console, "error").mockImplementation(() => {});

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId("grid-error")).toHaveTextContent(
          /unexpected error occurred/i
        );
      });
    });
  });

  describe("search functionality", () => {
    it("updates search term on input change", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ testRuns: [] }),
      } as Response);

      renderWithRouter();

      const searchInput = screen.getByPlaceholderText(
        /press enter to search/i
      );
      fireEvent.change(searchInput, { target: { value: "test query" } });

      expect(searchInput).toHaveValue("test query");
    });

    it("fetches results when Enter is pressed", async () => {
      const proxyWithAuthSpy = vi
        .spyOn(authFetch, "proxyWithAuth")
        .mockResolvedValue({
          ok: true,
          json: async () => ({ testRuns: [] }),
        } as Response);

      renderWithRouter();

      const searchInput = screen.getByPlaceholderText(
        /press enter to search/i
      );
      fireEvent.change(searchInput, { target: { value: "test query" } });
      fireEvent.keyUp(searchInput, { key: "Enter" });

      await waitFor(() => {
        expect(proxyWithAuthSpy).toHaveBeenCalledWith(
          "/test-runs?page=1&search=test%20query&pageSize=10"
        );
      });
    });

    it("clears search when backspace is pressed on empty input", async () => {
      const proxyWithAuthSpy = vi
        .spyOn(authFetch, "proxyWithAuth")
        .mockResolvedValue({
          ok: true,
          json: async () => ({ testRuns: [] }),
        } as Response);

      renderWithRouter(["/?q=existing"]);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(
          /press enter to search/i
        );
        expect(searchInput).toHaveValue("existing");
      });

      const searchInput = screen.getByPlaceholderText(
        /press enter to search/i
      );
      fireEvent.change(searchInput, { target: { value: "" } });
      fireEvent.keyUp(searchInput, { key: "Backspace" });

      await waitFor(() => {
        expect(proxyWithAuthSpy).toHaveBeenCalledWith(
          "/test-runs?page=1&pageSize=10"
        );
      });
    });

    it("shows clear button when search term is present", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ testRuns: [] }),
      } as Response);

      renderWithRouter();

      const searchInput = screen.getByPlaceholderText(
        /press enter to search/i
      );
      fireEvent.change(searchInput, { target: { value: "test" } });

      expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
    });

    it("clears search when clear button is clicked", async () => {
      renderWithRouter(["/?q=test"]);

      await waitFor(() => {
        expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("Clear search"));

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(
          /press enter to search/i
        );
        expect(searchInput).toHaveValue("");
      });
    });

    it("shows empty state when search returns no results", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ testRuns: [] }),
      } as Response);

      renderWithRouter(["/?q=nonexistent"]);

      await waitFor(() => {
        expect(screen.getByText(/no results for/i)).toBeInTheDocument();
        expect(
          screen.getByText(/try a different term/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("pagination", () => {
    it("shows pagination controls when there are test runs", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockTestRuns }),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("prev")).toBeInTheDocument();
        expect(screen.getByText("next")).toBeInTheDocument();
      });
    });

    it("disables prev button on first page", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockTestRuns }),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        const prevButton = screen.getByText("prev");
        expect(prevButton).toBeDisabled();
      });
    });

    it("enables prev button on page > 1", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockTestRuns }),
      } as Response);

      renderWithRouter(["/?page=2"]);

      await waitFor(() => {
        const prevButton = screen.getByText("prev");
        expect(prevButton).not.toBeDisabled();
      });
    });

    it("navigates to next page when next button clicked", async () => {
      const proxyWithAuthSpy = vi
        .spyOn(authFetch, "proxyWithAuth")
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            data: Array(10).fill(mockTestRuns[0]),
          }),
        } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("next")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("next"));

      await waitFor(() => {
        expect(proxyWithAuthSpy).toHaveBeenCalledWith(
          "/test-runs?page=2&pageSize=10"
        );
      });
    });

    it("navigates to previous page when prev button clicked", async () => {
      const proxyWithAuthSpy = vi
        .spyOn(authFetch, "proxyWithAuth")
        .mockResolvedValue({
          ok: true,
          json: async () => ({ data: mockTestRuns }),
        } as Response);

      renderWithRouter(["/?page=2"]);

      await waitFor(() => {
        expect(screen.getByText("prev")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("prev"));

      await waitFor(() => {
        expect(proxyWithAuthSpy).toHaveBeenCalledWith(
          "/test-runs?page=1&pageSize=10"
        );
      });
    });

    it("disables next button when fewer results than page size", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockTestRuns }), // Only 2 items, less than MAX_PAGE_SIZE (10)
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        const nextButton = screen.getByText("next");
        expect(nextButton).toBeDisabled();
      });
    });

    it("preserves search query when paginating", async () => {
      const proxyWithAuthSpy = vi
        .spyOn(authFetch, "proxyWithAuth")
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            data: Array(10).fill(mockTestRuns[0]),
          }),
        } as Response);

      renderWithRouter(["/?q=test&page=1"]);

      await waitFor(() => {
        expect(screen.getByText("next")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("next"));

      await waitFor(() => {
        expect(proxyWithAuthSpy).toHaveBeenCalledWith(
          "/test-runs?page=2&search=test&pageSize=10"
        );
      });
    });
  });

  describe("navigation", () => {
    it("navigates to conformance testing when Run Tests clicked", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockTestRuns }),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Run Tests")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Run Tests"));

      expect(mockNavigate).toHaveBeenCalledWith("/conformance-testing");
    });

    it("disables Run Tests button when no test runs", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ testRuns: [] }),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        const runTestsButton = screen.getByText("Run Tests");
        expect(runTestsButton).toBeDisabled();
      });
    });
  });

  describe("URL synchronization", () => {
    it("initializes search term from URL query parameter", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ testRuns: [] }),
      } as Response);

      renderWithRouter(["/?q=initial"]);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(
          /press enter to search/i
        );
        expect(searchInput).toHaveValue("initial");
      });
    });

    it("initializes page from URL parameter", async () => {
      const proxyWithAuthSpy = vi
        .spyOn(authFetch, "proxyWithAuth")
        .mockResolvedValue({
          ok: true,
          json: async () => ({ testRuns: mockTestRuns }),
        } as Response);

      renderWithRouter(["/?page=3"]);

      await waitFor(() => {
        expect(proxyWithAuthSpy).toHaveBeenCalledWith(
          "/test-runs?page=3&pageSize=10"
        );
      });
    });

    it("handles invalid page parameter gracefully", async () => {
      const proxyWithAuthSpy = vi
        .spyOn(authFetch, "proxyWithAuth")
        .mockResolvedValue({
          ok: true,
          json: async () => ({ data: mockTestRuns }),
        } as Response);

      renderWithRouter(["/?page=0"]);

      await waitFor(() => {
        expect(proxyWithAuthSpy).toHaveBeenCalledWith(
          "/test-runs?page=1&pageSize=10"
        );
      });
    });
  });

  describe("ConformanceTestRunsGrid integration", () => {
    it("passes correct props to ConformanceTestRunsGrid", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockTestRuns }),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId("grid-test-runs-count")).toHaveTextContent(
          "2"
        );
        expect(screen.getByTestId("grid-has-profile")).toHaveTextContent(
          "true"
        );
        expect(screen.getByTestId("grid-has-navigate")).toHaveTextContent(
          "true"
        );
      });
    });

    it("does not render grid when showing search empty state", async () => {
      vi.spyOn(authFetch, "proxyWithAuth").mockResolvedValue({
        ok: true,
        json: async () => ({ testRuns: [] }),
      } as Response);

      renderWithRouter(["/?q=nonexistent"]);

      await waitFor(() => {
        expect(screen.getByText(/no results for/i)).toBeInTheDocument();
      });

      expect(screen.queryByTestId("conformance-grid")).not.toBeInTheDocument();
    });
  });
});