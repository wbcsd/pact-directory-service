import React from "react";
import { Box, Button, Callout } from "@radix-ui/themes";
import Spinner from "../components/LoadingSpinner";
import { NavLink, NavigateFunction } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import EmptyImage from "../assets/pact-logistics-center-8.png";
import { ProfileData } from "../contexts/AuthContext";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
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

interface Props {
  testRuns: TestRun[];
  profileData: ProfileData | null;
  navigate: NavigateFunction;
  error: string | null;
  isLoading: boolean;
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

const ConformanceTestRunsGrid: React.FC<Props> = ({
  testRuns,
  profileData,
  navigate,
  error,
  isLoading,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Box className="loadingBox">
        <Spinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="errorBox">
        <h2>{t("conformancetestrunsgrid.title")}</h2>
        <Callout.Root color="red" size="2">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
        <Box mt="4">
          <Button onClick={() => navigate("/conformance-testing")}>
            {t("conformancetestrunsgrid.actions.backToForm")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (testRuns.length === 0) {
    return (
      <div className="emptyState">
        <img src={EmptyImage} alt={t("conformancetestrunsgrid.empty.alt")} />
        <h2>{t("conformancetestrunsgrid.empty.title")}</h2>
        <p className="emptyHint">{t("conformancetestrunsgrid.empty.hint")}</p>
        <Button onClick={() => navigate("/conformance-testing")}>
          {t("conformancetestrunsgrid.actions.runTests")}
        </Button>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="test-runs-table">
        <thead>
          <tr>
            <th>{t("conformancetestrunsgrid.table.testRunId")}</th>
            {profileData?.role === "administrator" && (
              <th>{t("conformancetestrunsgrid.table.company")}</th>
            )}
            {profileData?.role === "administrator" && (
              <th>{t("conformancetestrunsgrid.table.email")}</th>
            )}
            <th>{t("conformancetestrunsgrid.table.status")}</th>
            <th>{t("conformancetestrunsgrid.table.version")}</th>
            <th>{t("conformancetestrunsgrid.table.runDate")}</th>
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
              <td className="test-gridcell-datetime">
                <span>{formatDate(run.timestamp)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ConformanceTestRunsGrid;
