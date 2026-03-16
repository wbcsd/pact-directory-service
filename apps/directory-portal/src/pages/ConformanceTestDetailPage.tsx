import React, { useState, useEffect } from "react";
import { Heading, Text, Button, Box, Badge, Callout } from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  ReaderIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import DataTable, { Column } from "../components/DataTable";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { proxyWithAuth } from "../utils/auth-fetch";
import CodeIcon from "../components/CodeIcon";
import ConformanceTestForm, {
  ConformanceTestFormData,
} from "../components/ConformanceTestForm";
import { FunctionalPageLayout } from "../layouts";
import "./ConformanceTestDetailPage.css";

export interface TestCase {
  name: string;
  status: "SUCCESS" | "FAILURE" | "PENDING";
  mandatory: string;
  errorMessage: string;
  apiResponse?: string;
  curlRequest?: string;
  testKey: string;
  documentationUrl?: string;
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

const calculateMandatoryStats = (cases: TestCase[]) => {
  let total = 0;
  let success = 0;
  let failure = 0;
  let pending = 0;

  cases.forEach((testCase) => {
    if (testCase.mandatory !== "Yes") return;
    total += 1;
    switch (testCase.status) {
      case "SUCCESS":
        success += 1;
        break;
      case "FAILURE":
        failure += 1;
        break;
      case "PENDING":
        pending += 1;
        break;
      default:
        pending += 1;
        break;
    }
  });

  if (total === 0) {
    return {
      total: 0,
      success: 0,
      failure: 0,
      pending: 0,
      successPct: 0,
      failurePct: 0,
      pendingPct: 0,
    };
  }

  const successPct = Math.round((success / total) * 100);
  const failurePct = Math.round((failure / total) * 100);
  const pendingPct = Math.max(0, 100 - successPct - failurePct);

  return {
    total,
    success,
    failure,
    pending,
    successPct,
    failurePct,
    pendingPct,
  };
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

const ConformanceTestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNewTest = id === "new";
  const testRunId = isNewTest ? undefined : id;

  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);
  const [isLoading, setIsLoading] = useState(!isNewTest);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [techSpecVersion, setTechSpecVersion] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { profileData } = useAuth();

  const handleSubmit = async (data: ConformanceTestFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await proxyWithAuth(`/test`, {
        method: "POST",
        body: JSON.stringify({
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          apiUrl: data.apiUrl,
          authBaseUrl: data.authBaseUrl,
          version: data.version,
          scope: data.authOptions.scope,
          audience: data.authOptions.audience,
          resource: data.authOptions.resource,
        }),
      });

      if (!response || !response.ok) {
        throw new Error("Failed to create test run");
      }

      const result = await response.json();
      setIsSubmitting(false);
      if (result.error) {
        setError(result.error);
        return;
      }

      navigate(`/conformance-test-runs/${result.testRunId}`);
    } catch (err) {
      console.error("Error creating test run:", err);
      setError(
        "An unexpected error occurred while running tests. Please try again."
      );
      setIsSubmitting(false);
    }
  };

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
        setTechSpecVersion(data.techSpecVersion);
        setOrganizationName(data.organizationName);
        setAdminName(data.adminName);
        setAdminEmail(data.adminEmail);
        setIsLoading(false);

        // Poll for updates if there are pending test cases
        const hasPending = data.results.some(
          (r: { status: string }) => r.status === "PENDING"
        );
        if (hasPending) {
          pollTestResults(1, setTestCases, id, isCancelled);
        }
      } catch (error) {
        console.error("Error fetching test results:", error);
        setError(
          "An unexpected error occurred while fetching test results. Please try again."
        );
        setIsLoading(false);
      }
    };

    if (testRunId) {
      fetchTestResults(testRunId);
    } else if (!isNewTest) {
      navigate("/conformance-test-runs");
    }

    return () => {
      cancelled = true;
    };
  }, [testRunId, isNewTest, navigate]);

  const selectTestAndScroll = (test: TestCase) => {
    setSelectedTest(test);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const columns: Column<TestCase>[] = [
    {
      key: "name",
      header: "Test Case",
      render: (test) => (
        <span
          onClick={() => selectTestAndScroll(test)}
          className={`clickable ${
            selectedTest?.testKey === test.testKey ? "selected" : ""
          }`}
        >
          {test.name}
        </span>
      ),
    },
    ...(!selectedTest
      ? [
          {
            key: "status",
            header: "Status",
            render: (test: TestCase) => (
              <Badge color={getStatusColor(test)}>{getStatusText(test)}</Badge>
            ),
          },
          {
            key: "mandatory",
            header: "Mandatory Test?",
            render: (test: TestCase) => test.mandatory,
          },
          {
            key: "actions",
            header: "",
            render: (test: TestCase) => (
              <Button
                onClick={() => selectTestAndScroll(test)}
                style={{
                  background: "transparent",
                  color: "#0A0552",
                  border: "1px solid #EBF0F5",
                  padding: "8px 12px",
                  minHeight: "0",
                }}
              >
                <CodeIcon />
                Details
              </Button>
            ),
          },
        ]
      : []),
  ];

  const mandatoryStats = calculateMandatoryStats(testCases);
  const testRunStatus = mandatoryStats.total === 0 ? "N/A" : mandatoryStats.failure === 0 && mandatoryStats.pending === 0 ? "PASS" : mandatoryStats.failure > 0 ? "FAIL" : "PENDING";

  if (isNewTest) {
    return (
      <FunctionalPageLayout 
        wrapInMain={false}
        loading={isSubmitting} 
        loadingMessage="Running conformance tests against your API..."
        >
        <main className="main">
          <div className="header">
            <h2>Run conformance tests</h2>
            <p>
              Enter the required information to run the conformance tests
              against your API implementation.
            </p>
          </div>
          {error && (
            <Callout.Root color="red" size="2">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}
          <ConformanceTestForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </main>
      </FunctionalPageLayout>
    );
  }

  return (
    <FunctionalPageLayout
      wrapInMain={false}
      loading={isLoading}
      loadingMessage="Loading test results ..."
    >
      {error ? (
        <main className="main">
          <h2>Conformance Test Result</h2>
          <Callout.Root color="red" size="2">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
          <Box mt="4">
            <Button onClick={() => navigate("/conformance-test-runs/new")}>
              Back to Testing Form
            </Button>
          </Box>
        </main>
      ) : (
        <>
          <main className={`main ${selectedTest ? "split" : "full-width"}`}>
            <div className="header">
              <div>
                <h2>
                  Test Run ID {testRunId?.substring(0, 8)}{" "}
                  <Badge
                    style={{
                      verticalAlign: "middle",
                      color: "#84A0FF",
                      marginLeft: "10px",
                    }}
                  >
                    Testing conformance to {techSpecVersion}
                  </Badge>
                </h2>
                <p style={{ color: "#888", fontSize: "0.875rem" }}>
                  Review the test cases that were executed against your API
                </p>
              </div>
              {profileData?.role === "administrator" && (
                <div>
                  <div>{organizationName}</div>
                  <div>{adminName}</div>
                  <div>{adminEmail}</div>
                </div>
              )}
              {(profileData?.role !== "administrator" ||
                profileData?.email === adminEmail) && (
                <Button onClick={() => navigate("/conformance-test-runs/new")}>
                  Run new test
                </Button>
              )}
            </div>

            <div className="result-summary">
              <Box className="summary-card">
                <Box width={"80%"}>
                  <Text size="2">Mandatory Tests</Text>
                  <div className="mandatory-bar" role="img" aria-label="Mandatory test outcomes">
                    <div
                      className="mandatory-bar-segment success"
                      style={{ width: `${mandatoryStats.successPct}%` }}
                    />
                    <div
                      className="mandatory-bar-segment pending"
                      style={{ width: `${mandatoryStats.pendingPct}%` }}
                    />
                    <div
                      className="mandatory-bar-segment failure"
                      style={{ width: `${mandatoryStats.failurePct}%` }}
                    />
                  </div>
                  <Text size="1" color="gray">
                    {mandatoryStats.successPct}% passed, {mandatoryStats.pendingPct}% pending, {mandatoryStats.failurePct}% failed
                  </Text>
                  <Heading
                    as="h3"
                    color={testRunStatus === "PASS" ? "green" : testRunStatus === "PENDING" ? "yellow" : "red"}
                  >
                    {testRunStatus}
                  </Heading>
                </Box>
              </Box>
            </div>

            <DataTable<TestCase>
              idColumnName="testKey"
              data={testCases.sort(sortTestCases)}
              columns={columns}
              onRowClick={(row) => selectTestAndScroll(row)}
              isLoading={isLoading}
              error={error}
              emptyState={{
                title: "No test cases available",
              }}
            />
            {testCases.length === 0 && (
              <div className="no-tests">No test cases available.</div>
            )}
          </main>

          {selectedTest && (
            <div className="test-details-container">
              <Box id="test-details" className="test-box">
                <Box className="test-box-header">
                  <Heading as="h2" size="4">
                    {selectedTest.name}
                  </Heading>
                  <Box className="test-box-actions">
                    <Badge color={getStatusColor(selectedTest)}>
                      {getStatusText(selectedTest)}
                    </Badge>
                    <Button
                      onClick={() => setSelectedTest(null)}
                      variant="ghost"
                      size="1"
                      style={{
                        background: "transparent",
                        color: "#888",
                        border: "none",
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                      title="Close panel"
                    >
                      Close Panel <DoubleArrowRightIcon />
                    </Button>
                  </Box>
                </Box>

                {selectedTest.documentationUrl && (
                  <div className="documentation-section">
                    <div>
                      <ReaderIcon />{" "}
                      <a
                        style={{ textDecoration: "underline" }}
                        href={selectedTest.documentationUrl}
                      >
                        View test documentation
                      </a>
                    </div>
                    <Badge
                      color={selectedTest.mandatory === "Yes" ? "blue" : "gray"}
                      style={{ fontSize: "12px" }}
                    >
                      {selectedTest.mandatory === "Yes"
                        ? "Mandatory"
                        : "Optional"}
                    </Badge>
                  </div>
                )}

                <Text
                  size="2"
                  mb="4"
                  dangerouslySetInnerHTML={{
                    __html: selectedTest.errorMessage ?? "No errors.",
                  }}
                />
                <br />

                {selectedTest.curlRequest && (
                  <Box className="code-block">
                    <div className="code-content">
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
                  <Box className="code-block">
                    <div className="code-content">
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
    </FunctionalPageLayout>
  );
};

export default ConformanceTestDetailPage;
