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
import { useNavigate } from "react-router-dom";
import { proxyWithAuth } from "../utils/auth-fetch";

interface TestRun {
  id: string;
  timestamp: string;
  companyName: string;
  passingPercentage: number;
  status: "COMPLETED" | "FAILED" | "IN_PROGRESS";
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "green";
    case "FAILED":
      return "red";
    case "IN_PROGRESS":
      return "blue";
    default:
      return "gray";
  }
};

const formatDateTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

  const handleViewResults = (testRunId: string) => {
    navigate(`/conformance-test-result?testRunId=${testRunId}`);
  };

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
        <Box
          style={{
            padding: "20px",
            maxWidth: "800px",
            width: "800px",
          }}
        >
          <h2>Conformance Test Runs</h2>
          <Card size="3" style={{ maxWidth: 800, margin: "40px auto" }}>
            <Heading as="h1" size="5" mb="3">
              Recent Test Runs
            </Heading>

            {testRuns.length === 0 ? (
              <Text size="2">No test runs found.</Text>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Pass Rate</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {testRuns.map((run) => (
                    <Table.Row key={run.id}>
                      <Table.Cell>{formatDateTime(run.timestamp)}</Table.Cell>
                      <Table.Cell>{run.companyName}</Table.Cell>
                      <Table.Cell>{run.passingPercentage}%</Table.Cell>
                      <Table.Cell>
                        <Badge color={getStatusColor(run.status)}>
                          {run.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          size="1"
                          onClick={() => handleViewResults(run.id)}
                          disabled={run.status === "IN_PROGRESS"}
                        >
                          View Results
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Card>
          <Button onClick={() => navigate("/conformance-testing")}>
            Run New Test
          </Button>
        </Box>
      )}
    </Flex>
  );
};

export default ConformanceTestRuns;
