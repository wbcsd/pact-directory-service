import React, { useState, useEffect } from "react";
import { Heading, Text, Button, Box, Badge, Callout } from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  ReaderIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import SideNav from "../components/SideNav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useConformanceTesting } from "../components/ConformanceTesting";
import { useAuth } from "../contexts/AuthContext";
import { proxyWithAuth } from "../utils/auth-fetch";
import Spinner from "../components/LoadingSpinner";
import CodeIcon from "../components/CodeIcon";
import { useTranslation } from "react-i18next";
import "./ConformanceTestResult.css";

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
    return "conformancetestresult.status.warning";

  switch (testCase.status) {
    case "SUCCESS":
      return "conformancetestresult.status.passed";
    case "FAILURE":
      return "conformancetestresult.status.failed";
    case "PENDING":
      return "conformancetestresult.status.pending";
    default:
      return "conformancetestresult.status.pending";
  }
};

const mapTestCases = (
  test: { status: string; mandatory: boolean },
  t: typeof Function
) => ({
  ...test,
  mandatory: test.mandatory
    ? t("conformancetestresult.mandatoryYes")
    : t("conformancetestresult.mandatoryNo"),
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
  const [searchParams] = useSearchParams();
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [passingPercentage, setPassingPercentage] = useState(0);
  const [nonMandatoryPassingPercentage, setNonMandatoryPassingPercentage] =
    useState(0);
  const [techSpecVersion, setTechSpecVersion] = useState("");
  const [isNewTestRun, setIsNewTestRun] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const navigate = useNavigate();
  const { profileData } = useAuth();
  const { apiUrl, authBaseUrl, clientId, clientSecret, version, authOptions } =
    useConformanceTesting();
  const testRunId = searchParams.get("testRunId");

  const { t } = useTranslation();

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
        setNonMandatoryPassingPercentage(data.nonMandatoryPassingPercentage);
        setTechSpecVersion(data.techSpecVersion);
        setCompanyName(data.companyName);
        setAdminName(data.adminName);
        setAdminEmail(data.adminEmail);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching test results:", error);
        setError(t("conformancetestresult.errors.fetchResults"));
        setIsLoading(false);
      }
    };

    const runNewTest = async () => {
      if (!apiUrl || !clientId || !clientSecret || !version) {
        navigate("/conformance-testing");
        return;
      }

      setIsNewTestRun(true);

      try {
        const response = await proxyWithAuth(`/test`, {
          method: "POST",
          body: JSON.stringify({
            clientId,
            clientSecret,
            apiUrl,
            authBaseUrl,
            version,
            scope: authOptions?.scope,
            audience: authOptions?.audience,
            resource: authOptions?.resource,
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
        setNonMandatoryPassingPercentage(data.nonMandatoryPassingPercentage);
        setTechSpecVersion(data.techSpecVersion);
        setCompanyName(data.companyName);
        setAdminName(data.adminName);
        setAdminEmail(data.adminEmail);
        setIsLoading(false);

        navigate(`/conformance-test-result?testRunId=${data.testRunId}`, {
          replace: true,
        });

        pollTestResults(1, setTestCases, data.testRunId, isCancelled);
      } catch (error) {
        console.error("Error fetching test response:", error);
        setError(t("conformancetestresult.errors.runTests"));
        setIsLoading(false);
      }
    };

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
    t,
  ]);

  const selectTestAndScroll = (test: TestCase) => {
    setSelectedTest(test);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>

      {isLoading ? (
        <Box className="spinner-container">
          <Spinner
            loadingText={
              isNewTestRun
                ? t("conformancetestresult.loading.inProgress")
                : t("conformancetestresult.loading.results")
            }
          />
        </Box>
      ) : error ? (
        <Box className="error-container">
          <h2>{t("conformancetestresult.title")}</h2>
          <Callout.Root color="red" size="2">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
          <Box mt="4">
            <Button onClick={() => navigate("/conformance-testing")}>
              {t("conformancetestresult.actions.backToForm")}
            </Button>
          </Box>
        </Box>
      ) : (
        <>
          <main className={`main ${selectedTest ? "split" : "full-width"}`}>
            <div className="header">
              <div>
                <h2>
                  {t("conformancetestresult.testRunId")}{" "}
                  {testRunId?.substring(0, 8)}{" "}
                  <Badge
                    style={{
                      verticalAlign: "middle",
                      color: "#84A0FF",
                      marginLeft: "10px",
                    }}
                  >
                    {t("conformancetestresult.testingConformance", {
                      version: techSpecVersion,
                    })}
                  </Badge>
                </h2>
                <p style={{ color: "#888", fontSize: "0.875rem" }}>
                  {t("conformancetestresult.reviewMessage")}
                </p>
              </div>
              {profileData?.role === "administrator" && (
                <div>
                  <div>{companyName}</div>
                  <div>{adminName}</div>
                  <div>{adminEmail}</div>
                </div>
              )}
              {(profileData?.role !== "administrator" ||
                profileData?.email === adminEmail) && (
                <Button onClick={() => navigate("/conformance-testing")}>
                  {t("conformancetestresult.actions.retest")}
                </Button>
              )}
            </div>

            <div className="result-summary">
              <Box className="summary-card">
                <Box width={"80%"}>
                  <Text size="2" style={{ color: "#888" }}>
                    {t("conformancetestresult.mandatoryTests")}
                  </Text>
                  <Heading as="h3" style={{ color: "#000080" }}>
                    {passingPercentage}%
                  </Heading>
                </Box>
                <Box style={{ textAlign: "right" }}>
                  <Badge
                    color={passingPercentage === 100 ? "green" : "red"}
                    style={{ fontWeight: "normal", fontSize: "14px" }}
                  >
                    {passingPercentage === 100
                      ? t("conformancetestresult.status.passed")
                      : t("conformancetestresult.status.failed")}
                  </Badge>
                </Box>
              </Box>

              <Box className="summary-card">
                <Box width={"80%"}>
                  <Text size="2" style={{ color: "#888" }}>
                    {t("conformancetestresult.optionalTests")}
                  </Text>
                  <Heading as="h3" style={{ color: "#000080" }}>
                    {nonMandatoryPassingPercentage}%
                  </Heading>
                </Box>
                <Box style={{ textAlign: "right" }}>
                  <Badge
                    color={
                      nonMandatoryPassingPercentage === 100 ? "green" : "red"
                    }
                    style={{ fontWeight: "normal", fontSize: "14px" }}
                  >
                    {nonMandatoryPassingPercentage === 100
                      ? t("conformancetestresult.status.passed")
                      : t("conformancetestresult.status.failed")}
                  </Badge>
                </Box>
              </Box>
            </div>

            <div className="table-container">
              <table className="test-runs-table">
                <thead>
                  <tr>
                    <th style={{ width: "60%" }}>
                      {t("conformancetestresult.table.testCase")}
                    </th>
                    {!selectedTest && (
                      <>
                        <th>{t("conformancetestresult.table.status")}</th>
                        <th>{t("conformancetestresult.table.mandatory")}</th>
                        <th></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {testCases.sort(sortTestCases).map((test) => (
                    <tr key={test.testKey}>
                      <td
                        onClick={() => selectTestAndScroll(test)}
                        className={`clickable ${
                          selectedTest?.testKey === test.testKey
                            ? "selected"
                            : ""
                        }`}
                      >
                        {test.name}
                      </td>
                      {!selectedTest && (
                        <>
                          <td>
                            <Badge color={getStatusColor(test)}>
                              {t(getStatusText(test))}
                            </Badge>
                          </td>
                          <td>{test.mandatory}</td>
                          <td style={{ textAlign: "right" }}>
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
                              {t("conformancetestresult.actions.details")}
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {testCases.length === 0 && (
                <div className="no-tests">
                  {t("conformancetestresult.noTests")}
                </div>
              )}
            </div>
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
                      {t(getStatusText(selectedTest))}
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
                      title={t("conformancetestresult.actions.closePanel")}
                    >
                      {t("conformancetestresult.actions.closePanel")}{" "}
                      <DoubleArrowRightIcon />
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
                        {t("conformancetestresult.actions.viewDocumentation")}
                      </a>
                    </div>
                    <Badge
                      color={selectedTest.mandatory === "Yes" ? "blue" : "gray"}
                      style={{ fontSize: "12px" }}
                    >
                      {selectedTest.mandatory === "Yes"
                        ? t("conformancetestresult.mandatory")
                        : t("conformancetestresult.optional")}
                    </Badge>
                  </div>
                )}

                <Text
                  size="2"
                  mb="4"
                  dangerouslySetInnerHTML={{
                    __html:
                      selectedTest.errorMessage ??
                      t("conformancetestresult.noErrors"),
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
    </>
  );
};

export default ConformanceTestResult;
