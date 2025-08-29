import React, { useState, useEffect } from "react";
import { Button } from "@radix-ui/themes";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SideNav from "../components/SideNav";
import { proxyWithAuth } from "../utils/auth-fetch";
import EmptyImage from "../assets/pact-logistics-center-8.png";
import ConformanceTestRunsGrid from "./ConformanceTestRunsGrid";
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

  const fetchRuns = async (query: string) => {
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
        return;
      }

      const runs: TestRun[] = data.testRuns || [];
      setTestRuns(runs);
    } catch (err) {
      console.error("Error fetching test runs:", err);
      setError(
        "An unexpected error occurred while fetching test runs. Please try again."
      );
    } finally {
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
    const val = event.currentTarget.value.trim();
    switch (event.key) {
      case "Enter":
        if (val.length === 0) {
          // clear search -> show all
          setSearchParams({}, { replace: true });
        } else {
          setSearchParams({ q: val }, { replace: true });
        }
        break;
      case "Backspace":
        if (val.length === 0) {
          // clear search -> show all
          if (searchParams.get("q") === null) return;
          setSearchParams({}, { replace: true });
          fetchRuns("");
        }
        break;
      default:
        break;
    }
  };

  const gridHeader = (
    <div className="header">
      <div>
        <h2>Overview</h2>
        <p className="headerSubtext">Showing runs from all conformance tests</p>
      </div>
      <div className="searchWrapper">
        <input
          autoFocus
          type="text"
          placeholder="Press enter to search by company name, email address or user name"
          className="searchInput"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyUp={onKeyUpSearch}
        />
        {searchTerm && (
          <button
            type="button"
            className="clearButton"
            aria-label="Clear search"
            onClick={() => {
              setSearchTerm("");
              setSearchParams({}, { replace: true });
            }}
          >
            ×
          </button>
        )}
      </div>
      <Button
        disabled={testRuns.length === 0}
        onClick={() => navigate("/conformance-testing")}
      >
        Run Tests
      </Button>
    </div>
  );

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        {Boolean(isLoading || error) === false && gridHeader}
        {testRuns.length === 0 && searchTerm.length > 0 ? (
          <div className="emptyState">
            <img src={EmptyImage} alt="No results" />
            <h2>No results for “{initialQuery}”</h2>
            <p className="emptyHint">
              Try a different term, or clear your search to see all test runs.
            </p>
          </div>
        ) : (
          <ConformanceTestRunsGrid
            testRuns={testRuns}
            navigate={navigate}
            profileData={profileData}
            isLoading={isLoading}
            error={error}
          />
        )}
      </main>
    </>
  );
};

export default ConformanceTestRuns;
