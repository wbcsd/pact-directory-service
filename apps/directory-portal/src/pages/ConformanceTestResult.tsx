import React, { useState, useEffect } from "react";
import { Heading, Text, Button, Box, Badge, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import SideNav from "../components/SideNav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useConformanceTesting } from "../components/ConformanceTesting";
import { proxyWithAuth } from "../utils/auth-fetch";
import Spinner from "../components/LoadingSpinner";

export interface TestCase {
  name: string;
  status: "SUCCESS" | "FAILURE" | "PENDING";
  mandatory: string;
  errorMessage: string;
  apiResponse?: string;
  curlRequest?: string;
  testKey: string;
}

const getStatusColor = (testCase: TestCase) => {
  if (testCase.status === "FAILURE" && testCase.mandatory === "NO")
    return "orange";

  switch (testCase.status) {
    case "SUCCESS":
      return "green";
    case "FAILURE":
      return "red";
    case "PENDING":
      return "gray";
    default:
      return "gray";
  }
};

const getStatusText = (testCase: TestCase) => {
  if (testCase.status === "FAILURE" && testCase.mandatory === "NO")
    return "Warning";

  switch (testCase.status) {
    case "SUCCESS":
      return "Passed";
    case "FAILURE":
      return "Failed";
    case "PENDING":
      return "Pending";
    default:
      return "Pending";
  }
};

const mapTestCases = (test: { status: string; mandatory: boolean }) => ({
  ...test,
  mandatory: test.mandatory ? "Yes" : "No",
});

const sortTestCases = (a: TestCase, b: TestCase) => {
  const aNum = Number(a.testKey.replace("TESTCASE#", ""));
  const bNum = Number(b.testKey.replace("TESTCASE#", ""));
  return aNum - bNum;
};

const pollTestResults = (
  attempt: number = 1,
  setTestCases: React.Dispatch<React.SetStateAction<TestCase[]>>,
  testRunId: string,
  isCancelled: () => boolean
) => {
  if (attempt > 5 || isCancelled()) return;
  setTimeout(async () => {
    if (isCancelled()) return;
    try {
      const pollResponse = await proxyWithAuth(
        `/test-results?testRunId=${testRunId}`
      );
      if (!pollResponse || !pollResponse.ok) {
        throw new Error("Failed to poll test results");
      }
      const pollData = await pollResponse.json();
      setTestCases(pollData.results.map(mapTestCases));
    } catch (pollError) {
      console.error(`Polling attempt ${attempt} error:`, pollError);
    }
    pollTestResults(attempt + 1, setTestCases, testRunId, isCancelled);
  }, 2000);
};

const ConformanceTestResult: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testRunId = searchParams.get("testRunId");

  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { apiUrl, authBaseUrl, clientId, clientSecret, version } =
    useConformanceTesting();

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [passingPercentage, setPassingPercentage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    const fetchTestResults = async (id: string) => {
      try {
        const response = await proxyWithAuth(`/test-results?testRunId=${id}`);

        if (!response || !response.ok) {
          throw new Error("Failed to fetch test results");
        }

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setIsLoading(false);
          return;
        }

        setTestCases(data.results.map(mapTestCases));
        setPassingPercentage(data.passingPercentage);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching test results:", error);
        setError(
          "An unexpected error occurred while fetching test results. Please try again."
        );
        setIsLoading(false);
      }
    };

    const runNewTest = async () => {
      if (!apiUrl || !clientId || !clientSecret || !version) {
        navigate("/conformance-testing");
        return;
      }

      try {
        const response = await proxyWithAuth(`/test`, {
          method: "POST",
          body: JSON.stringify({
            clientId,
            clientSecret,
            apiUrl,
            authBaseUrl,
            version,
          }),
        });

        if (!response || !response.ok) {
          throw new Error("Failed to fetch test response");
        }

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setIsLoading(false);
          return;
        }

        setTestCases(data.results.map(mapTestCases));
        setPassingPercentage(data.passingPercentage);
        setIsLoading(false);

        // Update URL with the test run ID without reloading the page
        navigate(`/conformance-test-result?testRunId=${data.testRunId}`, {
          replace: true,
        });

        pollTestResults(1, setTestCases, data.testRunId, isCancelled);
      } catch (error) {
        console.error("Error fetching test response:", error);
        setError(
          "An unexpected error occurred while running tests. Please try again."
        );
        setIsLoading(false);
      }
    };

    // Check if we have a testRunId in the URL
    if (testRunId) {
      fetchTestResults(testRunId);
    } else {
      runNewTest();
    }

    return () => {
      cancelled = true;
    };
  }, [
    testRunId,
    clientId,
    clientSecret,
    apiUrl,
    authBaseUrl,
    version,
    navigate,
  ]);

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
          <h2>Conformance Test Result</h2>
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
        <>
          <main
            className="main"
            style={{
              width: selectedTest ? "50%" : "100%",
              transition: "width 0.3s ease",
            }}
          >
            <div className="header">
              <div>
                <h2>Conformance Test Result</h2>
                <p style={{ color: "#888", fontSize: "0.875rem" }}>
                  Review the test cases that were executed against your API
                </p>
              </div>
              <Button onClick={() => navigate("/conformance-testing")}>
                Retest Conformance
              </Button>
            </div>

            {/* Test Summary Cards */}
            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
              <Box
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "20px",
                  borderRadius: "8px",
                  border: "1px solid #EBF0F5",
                  backgroundColor: "#fff",
                }}
              >
                <Box width={"80%"}>
                  <Text size="2" style={{ color: "#888" }}>
                    Mandatory Tests
                  </Text>
                  <Heading as="h3" style={{ color: "#000080" }}>
                    {passingPercentage}%
                  </Heading>
                </Box>
                <Box
                  style={{
                    textAlign: "right",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                  }}
                >
                  <Badge
                    color={passingPercentage === 100 ? "green" : "red"}
                    style={{ fontWeight: "normal", fontSize: "14px" }}
                  >
                    {passingPercentage === 100 ? "Passed" : "Failed"}
                  </Badge>
                </Box>
              </Box>
              <Box
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "20px",
                  borderRadius: "8px",
                  border: "1px solid #EBF0F5",
                  backgroundColor: "#fff",
                }}
              >
                <Box width={"80%"}>
                  <Text size="2" style={{ color: "#888" }}>
                    Optional Tests
                  </Text>
                  <Heading as="h3" style={{ color: "#000080" }}>
                    0%
                  </Heading>
                </Box>
                <Box
                  style={{
                    textAlign: "right",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                  }}
                >
                  <Badge
                    color={"red"}
                    style={{ fontWeight: "normal", fontSize: "14px" }}
                  >
                    Failed
                  </Badge>
                </Box>
              </Box>
            </div>

            <div className="table-container">
              <table className="test-runs-table">
                <thead>
                  <tr>
                    <th style={{ width: "60%" }}>Test Case</th>
                    <th>Status</th>
                    <th>Mandatory Test?</th>
                  </tr>
                </thead>
                <tbody>
                  {testCases.sort(sortTestCases).map((test) => (
                    <tr key={test.testKey}>
                      <td
                        onClick={() => {
                          setSelectedTest(test);
                          setTimeout(() => {
                            window.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });
                          }, 0);
                        }}
                        style={{
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        {test.name}
                      </td>
                      <td>
                        <Badge color={getStatusColor(test)}>
                          {getStatusText(test)}
                        </Badge>
                      </td>
                      <td>{test.mandatory}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>

          {selectedTest && (
            <div className="test-details-container" style={{ width: "50%" }}>
              <Box
                id="test-details"
                style={{
                  padding: "20px",
                  height: "100%",
                  overflowY: "auto",
                }}
              >
                <Box
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <Heading as="h2" size="4">
                    {selectedTest.name}
                  </Heading>
                  <Badge color={getStatusColor(selectedTest)}>
                    {getStatusText(selectedTest)}
                  </Badge>
                </Box>
                <Text
                  size="2"
                  mb="4"
                  dangerouslySetInnerHTML={{
                    __html: selectedTest.errorMessage ?? "No errors.",
                  }}
                />
                <br />
                {selectedTest.curlRequest && (
                  <Box
                    mt={"5"}
                    style={{
                      color: "#0A0552",
                      background: "#fff",
                      padding: "20px",
                      borderRadius: "8px",
                      border: "1px solid #EBF0F5",
                    }}
                  >
                    <div
                      style={{
                        maxHeight: 300,
                        overflowY: "auto",
                      }}
                    >
                      <Text
                        size="2"
                        mb="4"
                        dangerouslySetInnerHTML={{
                          __html: selectedTest.curlRequest ?? "",
                        }}
                      />
                    </div>
                  </Box>
                )}
                {selectedTest.apiResponse && (
                  <Box
                    mt={"5"}
                    style={{
                      color: "#0A0552",
                      background: "#fff",
                      padding: "20px",
                      borderRadius: "8px",
                      border: "1px solid #EBF0F5",
                    }}
                  >
                    <div
                      style={{
                        maxHeight: 300,
                        overflowY: "auto",
                      }}
                    >
                      <Text
                        size="2"
                        mb="4"
                        dangerouslySetInnerHTML={{
                          __html: selectedTest.apiResponse ?? "",
                        }}
                      />
                    </div>
                  </Box>
                )}
              </Box>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default ConformanceTestResult;
