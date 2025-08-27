import React, { useState, useEffect, useRef } from "react";
import { Button, Box, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useNavigate, NavLink, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SideNav from "../components/SideNav";
import StatusBadge from "../components/StatusBadge";
import { proxyWithAuth } from "../utils/auth-fetch";
import Spinner from "../components/LoadingSpinner";
import EmptyImage from "../assets/pact-logistics-center-8.png";
import "./ConformanceTestRuns.css";

interface TestRun {
  testId: string;
  techSpecVersion: string;
  timestamp: string;
  companyName: string;
  adminEmail: string;
  passingPercentage: number;
  status: "PASS" | "FAIL" | "PENDING";
}

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month} ${day}, ${year} ${hours}:${minutes}`;
};

const ConformanceTestRuns: React.FC = () => {
  const navigate = useNavigate();
  const { profileData } = useAuth();

  // URL-driven state
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>(initialQuery);

  // (Optional) tiny in-memory cache so going "back" doesn't refetch if we've already seen this query.
  // Keyed by query string ("" for all).
  const cacheRef = useRef<Map<string, TestRun[]>>(new Map());

  const fetchRuns = async (query: string) => {
    // Serve instantly from cache if available
    if (cacheRef.current.has(query)) {
      setTestRuns(cacheRef.current.get(query)!);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `/test-runs${
        query ? `?query=${encodeURIComponent(query)}` : ""
      }`;
      const response = await proxyWithAuth(url);
      if (!response || !response.ok)
        throw new Error("Failed to fetch test runs");

      const data = await response.json();
      if (data.error) {
        setError(data.error);
        setIsLoading(false);
        return;
      }

      const runs: TestRun[] = data.testRuns || [];
      cacheRef.current.set(query, runs);
      setTestRuns(runs);
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching test runs:", err);
      setError(
        "An unexpected error occurred while fetching test runs. Please try again."
      );
      setIsLoading(false);
    }
  };

  // On mount + whenever ?q changes, fetch using the URL as the source of truth.
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setSearchTerm(q); // keep input in sync with URL
    fetchRuns(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Enter-to-search: update the URL (which triggers the effect above)
  const onKeyUpSearch: React.KeyboardEventHandler<HTMLInputElement> = (
    event
  ) => {
    if (event.key !== "Enter") return;
    const val = event.currentTarget.value.trim();
    if (val.length === 0) {
      // clear search -> show all
      setSearchParams({}, { replace: true });
    } else if (val.length > 3) {
      setSearchParams({ q: val }, { replace: true });
    }
  };

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>

      {isLoading ? (
        <Box className="loadingBox">
          <Spinner />
        </Box>
      ) : error ? (
        <Box className="errorBox">
          <h2>Conformance Test Runs</h2>
          <Callout.Root color="red" size="2">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
          <Box mt="4">
            <Button onClick={() => navigate("/conformance-testing")}>
              Back to Testing Form
            </Button>
          </Box>
        </Box>
      ) : (
        <main className="main">
          {testRuns.length === 0 ? (
            <div className="emptyState">
              <img src={EmptyImage} alt="No tests yet" />
              <h2>You currently have no tests</h2>
              <p className="emptyHint">
                Start automated testing to ensure a PACT conformant solution
              </p>
              <Button onClick={() => navigate("/conformance-testing")}>
                Run Tests
              </Button>
            </div>
          ) : (
            <>
              <div className="header">
                <div>
                  <h2>Overview</h2>
                  <p className="headerSubtext">
                    Showing runs from all conformance tests
                  </p>
                </div>
                <div className="searchWrapper">
                  <input
                    type="text"
                    placeholder="Press enter to search by company name, email address or user name"
                    className="searchInput"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyUp={onKeyUpSearch}
                  />
                </div>
                <Button onClick={() => navigate("/conformance-testing")}>
                  Run Tests
                </Button>
              </div>

              <div className="table-container">
                <table className="test-runs-table">
                  <thead>
                    <tr>
                      <th>Test Run ID</th>
                      {profileData?.role === "administrator" && (
                        <th>Company</th>
                      )}
                      {profileData?.role === "administrator" && <th>Email</th>}
                      <th>Status</th>
                      <th>Version</th>
                      <th>Run Date/Time CET</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testRuns.map((run) => (
                      <tr key={run.testId}>
                        <td>
                          <NavLink
                            to={`/conformance-test-result?testRunId=${run.testId}`}
                          >
                            {run.testId.substring(0, 8)}
                          </NavLink>
                        </td>
                        {profileData?.role === "administrator" && (
                          <td>{run.companyName}</td>
                        )}
                        {profileData?.role === "administrator" && (
                          <td>{run.adminEmail}</td>
                        )}
                        <td>
                          <StatusBadge status={run.status} />
                        </td>
                        <td>{run.techSpecVersion}</td>
                        <td>
                          <span>{formatDate(run.timestamp)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      )}
    </>
  );
};

export default ConformanceTestRuns;
