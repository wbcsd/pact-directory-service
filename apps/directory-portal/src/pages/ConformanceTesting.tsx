import React from "react";
import { Box } from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";
import ConformanceTestForm, {
  ConformanceTestFormData,
} from "../components/ConformanceTestForm";
import { FunctionalPageLayout } from "../layouts";
import "./ConformanceTesting.css";

const ConformanceTesting: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = (data: ConformanceTestFormData) => {
    const params = new URLSearchParams({
      apiUrl: data.apiUrl,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      version: data.version,
      ...(data.authBaseUrl && { authBaseUrl: data.authBaseUrl }),
      ...(data.authOptions.scope && { scope: data.authOptions.scope }),
      ...(data.authOptions.audience && { audience: data.authOptions.audience }),
      ...(data.authOptions.resource && { resource: data.authOptions.resource }),
    });
    navigate(`/conformance-test-result?${params.toString()}`);
  };

  return (
    <FunctionalPageLayout wrapInMain={false}>
      <main className="main">
        <div className="header">
          <div>
            <h2>Run conformance tests</h2>
            <p>
              Enter the required information to run the conformance tests
              against your API implementation.
            </p>
          </div>
        </div>

        <ConformanceTestForm onSubmit={handleSubmit} />
      </main>
      <div className="test-details-container">
        <Box className="test-box">
          <h2 className="heading">Tech guidance</h2>

          <h3 className="subheading" id="solutionApiUrl">Solution API Base URL</h3>
          <p className="paragraph-text">
            Enter the base URL of your PACT Conformant API implementation. This
            URL will be used as the root endpoint for all API requests during
            the conformance testing process.
          </p>

          <p className="paragraph-text">
            The URL should be in the format{" "}
            <span className="inline-url">https://yourdomain.com/api</span>{" "}
            (without a trailing slash). Make sure your endpoint is accessible
            from the internet and has valid SSL certification.
          </p>

          <h3 className="subheading" id="authBaseUrl">Auth Base URL (optional)</h3>
          <p className="paragraph-text">
            If your implementation uses a separate authentication service,
            provide its base URL here. This field is optional if your
            authentication endpoints are part of the main API URL.
          </p>

          <p className="paragraph-text">
            The authentication service should support the OAuth 2.0 protocol
            with client credentials flow as specified in the{" "}
            <a href="https://docs.carbon-transparency.org/">
              PACT Technical Specifications.
            </a>
          </p>

          <h3 className="subheading" id="clientId">Client ID</h3>
          <p className="paragraph-text">
            Provide the Client ID that will be used to authenticate API requests
            during conformance testing. This ID should have sufficient
            permissions to access all endpoints required by the PACT
            specification.
          </p>

          <h3 className="subheading" id="clientSecret">Client Secret</h3>
          <p className="paragraph-text">
            Enter the Client Secret associated with your Client ID. This will be
            used along with the Client ID to obtain access tokens for
            authenticated API requests during testing.
          </p>

          <h3 className="subheading" id="authOptionsScope">Other Authentication Options</h3>
          <p className="paragraph-text">
            Common OAuth options like <code>Scope</code>, <code>Resource</code>{" "}
            and <code>Audience</code> are also available for configuration. Make
            sure to set these according to your API's requirements.
          </p>

          <h3 className="subheading" id="techSpecsVersion">Tech Specs Version</h3>
          <p className="paragraph-text">
            The{" "}
            <a href="https://docs.carbon-transparency.org/">
              PACT Technical Specifications
            </a>{" "}
            describe the PCF data model and API requirements that your
            implementation must conform to. Select the version that your
            solution implements.
          </p>

          <p className="paragraph-text">
            A given version is in beta if the testing suite has not yet been
            tested by a sufficient number of organizations for that version; the
            tool can nevertheless still be used to grant PACT Conformance
            status, but organizations may be subject to mandatory retesting, as
            per our{" "}
            <a
              href="https://github.com/wbcsd/pact-conformance-service/blob/main/docs/beta_retesting_policy.md"
              className="link-bold"
            >
              policy
            </a>
            .
          </p>
        </Box>
      </div>
    </FunctionalPageLayout>
  );
};

export default ConformanceTesting;
