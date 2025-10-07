import React, { useState, useEffect } from "react";
import { Button } from "@radix-ui/themes";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SideNav from "../components/SideNav";
import { proxyWithAuth } from "../utils/auth-fetch";
import EmptyImage from "../assets/pact-logistics-center-8.png";
import ConformanceTestRunsGrid from "./ConformanceTestRunsGrid";
import "./ConformanceTestRuns.css";

const MAX_PAGE_SIZE = 10;

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
  const initialPage = parseInt(searchParams.get("page") ?? "1", 10);

  const currentPage = initialPage > 0 ? initialPage : 1;

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>(initialQuery);

  const gotoNextPage = () => {
    setSearchParams({
      q: searchTerm || "",
      page: String(currentPage + 1),
    });
  };

  const gotoPrevPage = () => {
    setSearchParams({
      q: searchTerm || "",
      page: String(Math.max(1, currentPage - 1)),
    });
  };

  const fetchRuns = async (query: string, page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      let url = `/test-runs?page=${page}${
        query ? `&query=${encodeURIComponent(query)}` : ""
      }`;

      url += `&size=${MAX_PAGE_SIZE}`;

      const response = await proxyWithAuth(url);
      if (!response || !response.ok)
        throw new Error("Failed to fetch test runs");

      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      setTestRuns(data.testRuns || []);
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
    const page = parseInt(searchParams.get("page") ?? "1", 10);

    setSearchTerm(q); // keep input in sync
    fetchRuns(q, page > 0 ? page : 1);
  }, [searchParams]);

  // Enter-to-search: update the URL (which triggers the effect above)
  const onKeyUpSearch: React.KeyboardEventHandler<HTMLInputElement> = (
    event
  ) => {
    const val = event.currentTarget.value.trim();
    switch (event.key) {
      case "Enter":
        setSearchParams(val ? { q: val, page: "1" } : {});
        break;
      case "Backspace":
        if (val.length === 0 && searchParams.get("q") !== null) {
          setSearchParams({});
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
        {Boolean(error) === false && gridHeader}
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
        {testRuns.length > 0 && (
          <div className="paging-wrapper">
            <Button
              type="button"
              disabled={currentPage === 1}
              onClick={gotoPrevPage}
            >
              prev
            </Button>
            <Button
              disabled={testRuns.length < MAX_PAGE_SIZE}
              type="button"
              onClick={gotoNextPage}
            >
              next
            </Button>
          </div>
        )}
      </main>
    </>
  );
};

export default ConformanceTestRuns;
