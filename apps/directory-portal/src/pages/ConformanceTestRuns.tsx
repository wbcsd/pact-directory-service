import React, { useState, useEffect } from "react";
import { Button, Box, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useNavigate, NavLink } from "react-router-dom";
import SideNav from "../components/SideNav";
import StatusBadge from "../components/StatusBadge";
import { proxyWithAuth } from "../utils/auth-fetch";
import Spinner from "../components/LoadingSpinner";
import EmptyImage from "../assets/pact-logistics-center-8.png";

interface TestRun {
  testId: string;
  techSpecVersion: string;
  timestamp: string;
  companyName: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);

  useEffect(() => {
    const fetchTestRuns = async () => {
      try {
        const response = await proxyWithAuth(`/test-runs`);

        if (!response || !response.ok) {
          throw new Error("Failed to fetch test runs");
        }

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setIsLoading(false);
          return;
        }

        setTestRuns(data.testRuns || []);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching test runs:", error);
        setError(
          "An unexpected error occurred while fetching test runs. Please try again."
        );
        setIsLoading(false);
      }
    };

    fetchTestRuns();
  }, []);

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      {isLoading ? (
        <Box
          style={{
            padding: "20px",
            verticalAlign: "middle",
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Spinner />
        </Box>
      ) : error ? (
        <Box
          style={{
            padding: "20px",
            maxWidth: "800px",
            width: "800px",
          }}
        >
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
            <div
              style={{
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <img src={EmptyImage}></img>
              <h2>You currently have no tests</h2>
              <p
                style={{
                  color: "#9D9DB8",
                  fontSize: "0.875rem",
                  marginTop: "10px",
                  marginBottom: "20px",
                }}
              >
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
                  <p style={{ color: "#888", fontSize: "0.875rem" }}>
                    Showing runs from all conformance tests
                  </p>
                </div>
                <Button onClick={() => navigate("/conformance-testing")}>
                  Run Tests
                </Button>
              </div>
              <div className="table-container">
                <table className="test-runs-table">
                  <thead>
                    <tr>
                      <th>Test identifier</th>
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
                            {run.testId}
                          </NavLink>
                        </td>
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
