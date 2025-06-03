import React, { useState } from "react";
import { Box, Button, TextField } from "@radix-ui/themes";
import * as Form from "@radix-ui/react-form";
import SideNav from "../components/SideNav";
import { useNavigate } from "react-router-dom";
import { useConformanceTesting } from "../components/ConformanceTesting";

const ConformanceTesting: React.FC = () => {
  const {
    setApiUrl,
    setAuthBaseUrl,
    setClientId,
    setClientSecret,
    setVersion,
    setAuthOptions,
    apiUrl,
    authBaseUrl,
    clientId,
    clientSecret,
    version,
    authOptions,
  } = useConformanceTesting();

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    solutionApiUrl: apiUrl,
    authBaseUrl: authBaseUrl,
    clientId: clientId,
    clientSecret: clientSecret,
    techSpecsVersion: version,
    authOptionsScope: authOptions.scope,
    authOptionsAudience: authOptions.audience,
    authOptionsResource: authOptions.resource,
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    setApiUrl(formData.solutionApiUrl);
    setAuthBaseUrl(formData.authBaseUrl);
    setClientId(formData.clientId);
    setClientSecret(formData.clientSecret);
    setVersion(formData.techSpecsVersion);
    setAuthOptions({
      scope: formData.authOptionsScope,
      audience: formData.authOptionsAudience,
      resource: formData.authOptionsResource,
    });

    navigate("/conformance-test-result");
  };

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <div>
            <h2>Run conformance tests</h2>
            <p style={{ color: "#888" }}>
              Enter the required information to run the conformance tests
              against your API implementation.
            </p>
          </div>
        </div>

        <Form.Root
          onSubmit={handleSubmit}
          style={{
            maxWidth: "720px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <Form.Field name="solutionApiUrl" style={{ marginBottom: "20px" }}>
            <Form.Label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "var(--gray-12)",
              }}
            >
              Solution API Base URL<span style={{ color: "red" }}>*</span>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.solutionApiUrl}
                name="solutionApiUrl"
                required
                placeholder="https://api.example.com"
                onChange={handleChange}
                style={{
                  width: "100%",
                  border: "1px solid #ccc",
                  padding: "12px",
                  fontSize: "16px",
                }}
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="authBaseUrl" style={{ marginBottom: "20px" }}>
            <Form.Label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "var(--gray-12)",
              }}
            >
              Auth Base URL
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authBaseUrl}
                name="authBaseUrl"
                placeholder="https://auth.example.com"
                onChange={handleChange}
                style={{
                  width: "100%",
                  border: "1px solid #ccc",
                  padding: "12px",
                  fontSize: "16px",
                }}
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="clientId" style={{ marginBottom: "20px" }}>
            <Form.Label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "var(--gray-12)",
              }}
            >
              Client ID<span style={{ color: "red" }}>*</span>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.clientId}
                name="clientId"
                required
                placeholder="Client ID used for authentication by ACT"
                onChange={handleChange}
                style={{
                  width: "100%",
                  border: "1px solid #ccc",
                  padding: "12px",
                  fontSize: "16px",
                }}
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="clientSecret" style={{ marginBottom: "20px" }}>
            <Form.Label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "var(--gray-12)",
              }}
            >
              Client Secret<span style={{ color: "red" }}>*</span>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.clientSecret}
                name="clientSecret"
                required
                placeholder="Secret used for authentication by ACT"
                onChange={handleChange}
                style={{
                  width: "100%",
                  border: "1px solid #ccc",
                  padding: "12px",
                  fontSize: "16px",
                }}
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="scope" style={{ marginBottom: "20px" }}>
            <Form.Label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "var(--gray-12)",
              }}
            >
              Scope
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authOptionsScope}
                name="scope"
                placeholder="Scope used for authentication"
                onChange={handleChange}
                style={{
                  width: "100%",
                  border: "1px solid #ccc",
                  padding: "12px",
                  fontSize: "16px",
                }}
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="audience" style={{ marginBottom: "20px" }}>
            <Form.Label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "var(--gray-12)",
              }}
            >
              Audience
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authOptionsAudience}
                name="audience"
                placeholder="Audience used for authentication"
                onChange={handleChange}
                style={{
                  width: "100%",
                  border: "1px solid #ccc",
                  padding: "12px",
                  fontSize: "16px",
                }}
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="resource" style={{ marginBottom: "20px" }}>
            <Form.Label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "var(--gray-12)",
              }}
            >
              Resource
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authOptionsResource}
                name="resource"
                placeholder="Resource used for authentication"
                onChange={handleChange}
                style={{
                  width: "100%",
                  border: "1px solid #ccc",
                  padding: "12px",
                  fontSize: "16px",
                }}
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="techSpecsVersion" style={{ marginBottom: "20px" }}>
            <Form.Label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "var(--gray-12)",
              }}
            >
              Tech Specs Version<span style={{ color: "red" }}>*</span>
            </Form.Label>
            <Form.Control asChild>
              <select
                name="techSpecsVersion"
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "0",
                  border: "1px solid #ccc",
                  fontSize: "16px",
                }}
                defaultValue={formData.techSpecsVersion}
              >
                <option value="V2.0">2.0 (beta)</option>
                <option value="V2.1">2.1 (beta)</option>
                <option value="V2.2">2.2 (beta)</option>
                <option value="V2.3">2.3 (beta)</option>
                <option value="V3.0">3.0 (beta)</option>
              </select>
            </Form.Control>
          </Form.Field>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            <Form.Submit asChild>
              <Button
                type="submit"
                style={{
                  background: "#14144B",
                  color: "white",
                  padding: "10px 20px",
                  fontSize: "16px",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                Run tests
              </Button>
            </Form.Submit>
          </div>
        </Form.Root>
      </main>
      <div className="test-details-container" style={{ width: "50%" }}>
        <Box
          style={{
            padding: "2rem 3rem",
            height: "100%",
            overflowY: "auto",
          }}
        >
          <h2 style={styles.heading}>Tech guidance</h2>

          <h3 style={styles.subheading}>Solution API Base URL</h3>
          <p style={styles.paragraphText}>
            Enter the base URL of your PACT Conformant API implementation. This
            URL will be used as the root endpoint for all API requests during
            the conformance testing process.
          </p>

          <p style={styles.paragraphText}>
            The URL should be in the format{" "}
            <span className="inline-url">https://yourdomain.com/api</span>{" "}
            (without a trailing slash). Make sure your endpoint is accessible
            from the internet and has valid SSL certification.
          </p>

          <h3 style={styles.subheading}>Auth Base URL (optional)</h3>
          <p style={styles.paragraphText}>
            If your implementation uses a separate authentication service,
            provide its base URL here. This field is optional if your
            authentication endpoints are part of the main API URL.
          </p>

          <p style={styles.paragraphText}>
            The authentication service should support the OAuth 2.0 protocol
            with client credentials flow as specified in the{" "}
            <a href="https://docs.carbon-transparency.org/">
              PACT Technical Specifications.
            </a>
          </p>

          <h3 style={styles.subheading}>Client ID</h3>
          <p style={styles.paragraphText}>
            Provide the Client ID that will be used to authenticate API requests
            during conformance testing. This ID should have sufficient
            permissions to access all endpoints required by the PACT
            specification.
          </p>

          <h3 style={styles.subheading}>Client Secret</h3>
          <p style={styles.paragraphText}>
            Enter the Client Secret associated with your Client ID. This will be
            used along with the Client ID to obtain access tokens for
            authenticated API requests during testing.
          </p>

          <h3 style={styles.subheading}>Tech Specs Version</h3>
          <p style={styles.paragraphText}>
            The{" "}
            <a href="https://docs.carbon-transparency.org/">
              PACT Technical Specifications
            </a>{" "}
            describe the PCF data model and API requirements that your
            implementation must conform to. Select the version that your
            solution implements.
          </p>

          <p style={styles.paragraphText}>
            A given version is in beta if the testing suite has not yet been
            tested by a sufficient number of organizations for that version; the
            tool can nevertheless still be used to grant PACT Conformance
            status, but organizations may be subject to mandatory retesting, as
            per our{" "}
            <a
              style={{ fontWeight: "bold" }}
              href="https://github.com/wbcsd/pact-conformance-service/blob/main/docs/beta_retesting_policy.md"
            >
              policy
            </a>
            .
          </p>
        </Box>
      </div>
    </>
  );
};

const styles = {
  heading: {
    marginBottom: "10px",
  },
  subheading: {
    marginTop: "20px",
    marginBottom: "8px",
  },
  paragraphText: {
    color: "#9D9DB8",
    marginTop: "15px",
  },
};

export default ConformanceTesting;
