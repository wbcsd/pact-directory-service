import React, { useEffect, useState } from "react";
import { Box, Button, TextField } from "@radix-ui/themes";
import * as Form from "@radix-ui/react-form";
import SideNav from "../components/SideNav";
import { useNavigate } from "react-router-dom";
import { useConformanceTesting } from "../components/ConformanceTesting";
import "./ConformanceTesting.css";

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

  useEffect(() => {
    const isMobile = window.matchMedia(
      "(max-width: 767px), (pointer: coarse)"
    ).matches;
    
    if (!isMobile) {
      document.querySelectorAll('[class*="rt-TextFieldInput"]')
        .forEach(input => input.addEventListener('focus', (e) => {
            const scrollTargetElement = document.getElementById((e.target as HTMLInputElement).name);
            if (scrollTargetElement) {
              scrollTargetElement.scrollIntoView({behavior: 'smooth'});
            }
        }));
    }
  }, []);

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
            <p>
              Enter the required information to run the conformance tests
              against your API implementation.
            </p>
          </div>
        </div>

        <Form.Root onSubmit={handleSubmit} className="form-root">
          <Form.Field name="solutionApiUrl" className="form-field">
            <Form.Label className="form-label">
              Solution API Base URL<span className="required">*</span>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.solutionApiUrl}
                name="solutionApiUrl"
                required
                placeholder="https://api.example.com"
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="authBaseUrl" className="form-field">
            <Form.Label className="form-label">Auth Base URL</Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authBaseUrl}
                name="authBaseUrl"
                placeholder="https://auth.example.com"
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="clientId" className="form-field">
            <Form.Label className="form-label">
              Client ID<span className="required">*</span>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.clientId}
                name="clientId"
                required
                placeholder="Client ID used for authentication by ACT"
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="clientSecret" className="form-field">
            <Form.Label className="form-label">
              Client Secret<span className="required">*</span>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.clientSecret}
                name="clientSecret"
                required
                placeholder="Secret used for authentication by ACT"
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="scope" className="form-field">
            <Form.Label className="form-label">Scope</Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authOptionsScope}
                name="authOptionsScope"
                placeholder="Scope used for authentication"
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="audience" className="form-field">
            <Form.Label className="form-label">Audience</Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authOptionsAudience}
                name="authOptionsAudience"
                placeholder="Audience used for authentication"
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="resource" className="form-field">
            <Form.Label className="form-label">Resource</Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authOptionsResource}
                name="authOptionsResource"
                placeholder="Resource used for authentication"
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="techSpecsVersion" className="form-field">
            <Form.Label className="form-label">
              Tech Specs Version<span className="required">*</span>
            </Form.Label>
            <Form.Control asChild>
              <select
                name="techSpecsVersion"
                onChange={handleChange}
                required
                className="select"
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

          <div className="form-actions">
            <Form.Submit asChild>
              <Button type="submit" className="submit-button">
                Run tests
              </Button>
            </Form.Submit>
          </div>
        </Form.Root>
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
    </>
  );
};

export default ConformanceTesting;
