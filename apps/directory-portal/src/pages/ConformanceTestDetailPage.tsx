import React, { useState, useEffect } from "react";
import { Heading, Text, Code, Button, Box, Badge, Callout } from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import DataTable, { Column } from "../components/DataTable";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { proxyWithAuth } from "../utils/auth-fetch";
import CodeBlock from "../components/CodeBlock";
import ConformanceTestForm, { ConformanceTestFormData } from "../components/ConformanceTestForm";
import { FormPageLayout } from "../layouts";
import SlideOverPanel from "../components/SlideOverPanel";
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
  const [_adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [testRunDate, setTestRunDate] = useState("");
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
      
      if (!response) {
        throw new Error("No response from server");
      }

      if (!response.ok) {
        const errorText = await response!.text();
        throw new Error("Failed to create test run: " + response.status + " " + response.statusText + " - " + errorText);
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
      setError("" + err);
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
        setTestRunDate(data.timestamp);
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

  const selectTest = (test: TestCase) => {
    setSelectedTest(test);
  };

  const columns: Column<TestCase>[] = [
    {
      key: "name",
      header: "Test Case",
      render: (test) => (
        <span
          onClick={() => selectTest(test)}
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
              <Badge m="-1" color={getStatusColor(test)}>{getStatusText(test)}</Badge>
            ),
          },
          {
            key: "mandatory",
            header: "Mandatory",
            render: (test: TestCase) => test.mandatory,
          },
        ]
      : []),
  ];

  const mandatoryStats = calculateMandatoryStats(testCases);
  const testRunStatus = mandatoryStats.total === 0 ? "N/A" : mandatoryStats.failure === 0 && mandatoryStats.pending === 0 ? "PASS" : mandatoryStats.failure > 0 ? "FAIL" : "PENDING";

  if (isNewTest) {
    return (
      <FormPageLayout 
        title="Run Conformance Test"
        loading={isSubmitting} 
        loadingMessage="Running conformance tests against your API..."
        >
          {error && (
            <Callout.Root color="red" size="2">
              <Callout.Text><Code>{error}</Code></Callout.Text>
            </Callout.Root>
          )}
          <ConformanceTestForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout
      title={`Test Run - ${testRunId?.substring(0, 8)}`}
      loading={isLoading}
      loadingMessage="Loading test results ..."
    >
      {error ? (
        <>
          <h2>Conformance Test Result</h2>
          <Callout.Root color="red" size="2">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text><Code>{error}</Code></Callout.Text>
          </Callout.Root>
          <Box mt="4">
            <Button onClick={() => navigate("/conformance-test-runs/new")}>
              Back to Testing Form
            </Button>
          </Box>
        </>
      ) : (
        <>
              <Box className="summary-card">
                <div>
                  <div><Text size="2" weight="bold">Tech Spec:</Text> <Text size="2">{techSpecVersion}</Text></div>
                  {["administrator", "root"].includes(profileData?.role ?? "") && (                  
                  <>
                    <div><Text size="2" weight="bold">Organization:</Text> <Text size="2">{organizationName}</Text></div>
                    <div><Text size="2" weight="bold">Email:</Text> <Text size="2">{adminEmail}</Text></div>
                  </>
                  )}
                  {testRunDate && <div><Text size="2" weight="bold">Date:</Text> <Text size="2">{new Date(testRunDate).toLocaleDateString()}</Text></div>}
                </div>

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

            <DataTable<TestCase>
              idColumnName="testKey"
              data={testCases.sort(sortTestCases)}
              columns={columns}
              onRowClick={(row) => selectTest(row)}
              isLoading={isLoading}
              error={error}
              emptyState={{
                title: "No test cases available",
              }}
            />
            {testCases.length === 0 && (
              <div className="no-tests">No test cases available.</div>
            )}

          <SlideOverPanel
            slide
            open={!!selectedTest}
            onClose={() => setSelectedTest(null)}
            title={selectedTest?.name ?? ""}
            subtitle={selectedTest?.mandatory === "Yes" ? "Mandatory" : "Optional"}
          >
            {selectedTest && (
              <>
                <Box mb="3">
                  <Badge color={getStatusColor(selectedTest)}>
                    {getStatusText(selectedTest)}
                  </Badge>
                </Box>

                {selectedTest.documentationUrl && (
                  <Box mb="3">
                    <ReaderIcon style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                    <a
                      style={{ textDecoration: "underline" }}
                      href={selectedTest.documentationUrl}
                    >
                      View test documentation
                    </a>
                  </Box>
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
                  <CodeBlock language="bash">{selectedTest.curlRequest}</CodeBlock>
                )}

                {selectedTest.apiResponse && (
                  <CodeBlock language="json">{selectedTest.apiResponse}</CodeBlock>
                )}
              </>
            )}
          </SlideOverPanel>
        </>
      )}
    </FormPageLayout>
  );
};

export default ConformanceTestDetailPage;
