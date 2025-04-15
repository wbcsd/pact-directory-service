import React, { useState, useEffect } from "react";
import {
  Card,
  Heading,
  Text,
  Table,
  Button,
  Box,
  Flex,
  Badge,
  Spinner,
  Callout,
} from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import SideNav from "../components/SideNav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useConformanceTesting } from "../components/ConformanceTesting";
import { proxyWithAuth } from "../utils/auth-fetch";

export interface TestCase {
  name: string;
  status: "SUCCESS" | "FAILURE" | "PENDING";
  mandatory: string;
  errorMessage: string;
  apiResponse?: string;
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
  mandatory: test.mandatory ? "YES" : "NO",
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

  const [selectedTest, setSelectedTest] = useState<{
    name: string;
    errorMessage: string;
    apiResponse?: string;
  } | null>(null);
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
    <Flex gap="5" justify="center">
      <Box>
        <SideNav />
      </Box>
      {isLoading ? (
        <Box
          style={{
            padding: "20px",
            maxWidth: "800px",
            width: "800px",
          }}
        >
          <Spinner size="3" />
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
        <Box
          style={{
            padding: "20px",
            maxWidth: "800px",
            width: "800px",
          }}
        >
          <h2>Conformance Test Result</h2>
          <Card size="3" style={{ maxWidth: 800, margin: "40px auto" }}>
            {/* Main heading */}
            <Heading as="h1" size="5" mb="3">
              Test Results
            </Heading>

            {/* Summary text */}
            <Text size="2" mb="4" style={{ fontWeight: "bold" }}>
              {passingPercentage}% Mandatory Tests Pass
            </Text>

            {/* Table of test cases */}
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell style={{ width: "60%" }}>
                    Test Case
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>
                    Mandatory Test?
                  </Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {testCases.sort(sortTestCases).map((test) => (
                  <Table.Row key={test.testKey}>
                    <Table.Cell
                      onClick={() => setSelectedTest(test)}
                      style={{
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      {test.name}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={getStatusColor(test)}>
                        {getStatusText(test)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{test.mandatory}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>

            {selectedTest && (
              <Box mt="4">
                <Heading as="h2" size="4" mb="2">
                  {selectedTest.name}
                </Heading>
                <Text
                  size="2"
                  mb="4"
                  dangerouslySetInnerHTML={{
                    __html: selectedTest.errorMessage ?? "No errors.",
                  }}
                />
                <br />
                {selectedTest.apiResponse && (
                  <Text size="2" style={{ fontWeight: "bold" }}>
                    API Response:
                  </Text>
                )}
                <br />
                <Box style={{ maxHeight: 300, overflowY: "auto" }}>
                  <Text
                    size="2"
                    mb="4"
                    dangerouslySetInnerHTML={{
                      __html: selectedTest.apiResponse ?? "",
                    }}
                  />
                </Box>
              </Box>
            )}
          </Card>
          <Button onClick={() => navigate("/conformance-testing")}>
            Retest Conformance
          </Button>
        </Box>
      )}
    </Flex>
  );
};

export default ConformanceTestResult;
