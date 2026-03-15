import React, { useState } from "react";
import { Button } from "@radix-ui/themes";
import * as Form from "@radix-ui/react-form";
import { TextField, SelectField } from "./ui";

export interface ConformanceTestFormData {
  apiUrl: string;
  authBaseUrl: string;
  clientId: string;
  clientSecret: string;
  version: string;
  authOptions: {
    scope: string;
    audience: string;
    resource: string;
  };
}

interface ConformanceTestFormProps {
  onSubmit: (data: ConformanceTestFormData) => void;
  isSubmitting?: boolean;
}

const VERSION_OPTIONS = [
  { value: "V2.0", label: "2.0 (beta)" },
  { value: "V2.1", label: "2.1 (beta)" },
  { value: "V2.2", label: "2.2 (beta)" },
  { value: "V2.3", label: "2.3 (beta)" },
  { value: "V3.0", label: "3.0 (beta)" },
];

const ConformanceTestForm: React.FC<ConformanceTestFormProps> = ({
  onSubmit,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    solutionApiUrl: "",
    authBaseUrl: "",
    clientId: "",
    clientSecret: "",
    techSpecsVersion: "V3.0",
    authOptionsScope: "",
    authOptionsAudience: "",
    authOptionsResource: "",
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      apiUrl: formData.solutionApiUrl,
      authBaseUrl: formData.authBaseUrl,
      clientId: formData.clientId,
      clientSecret: formData.clientSecret,
      version: formData.techSpecsVersion,
      authOptions: {
        scope: formData.authOptionsScope,
        audience: formData.authOptionsAudience,
        resource: formData.authOptionsResource,
      },
    });
  };

  return (
    <div>
      <Form.Root onSubmit={handleSubmit} className="form-root">
        <TextField
          name="solutionApiUrl"
          label="Solution API Base URL"
          required
          value={formData.solutionApiUrl}
          placeholder="https://api.example.com"
          tooltip="
            This is the base URL of your PACT Conformant API implementation. 
            It will be used as the root endpoint for all API requests during the 
            conformance testing process. Make sure your endpoint is accessible 
            from the internet and has a valid SSL certificate."
          onChange={handleChange}
        />

        <TextField
          name="authBaseUrl"
          label="Auth Base URL"
          value={formData.authBaseUrl}
          placeholder="https://auth.example.com"
          tooltip="
            If your implementation uses a separate authentication service, provide 
            its base URL here. This field is optional if your authentication 
            endpoints are part of the main API URL. The authentication service
            should support the OAuth 2.0 protocol with client credentials flow 
            as specified in the PACT Technical Specifications."
          onChange={handleChange}
        />

        <TextField
          name="clientId"
          label="Client ID"
          required
          value={formData.clientId}
          placeholder="Client ID used for authentication by ACT"
          description="
            Provide the Client ID that will be used to authenticate API requests 
            during conformance testing. This ID should have sufficient permissions
            to access all endpoints required by the PACT specification."
          onChange={handleChange}
        />

        <TextField
          name="clientSecret"
          label="Client Secret"
          required
          value={formData.clientSecret}
          placeholder="Secret used for authentication by ACT"
          description="
            Enter the Client Secret associated with your Client ID. 
            This will be used along with the Client ID to obtain access tokens 
            for authenticated API requests during testing."
          onChange={handleChange}
        />

        <TextField
          name="authOptionsScope"
          label="Scope"
          value={formData.authOptionsScope}
          placeholder="Scope used for authentication"
          description="
            Common OAuth options like Scope, Resource and Audience are also 
            available for configuration. Make sure to set these according to 
            your API's requirements."
          onChange={handleChange}
        />

        <TextField
          name="authOptionsAudience"
          label="Audience"
          value={formData.authOptionsAudience}
          placeholder="Audience used for authentication"
          onChange={handleChange}
        />

        <TextField
          name="authOptionsResource"
          label="Resource"
          value={formData.authOptionsResource}
          placeholder="Resource used for authentication"
          onChange={handleChange}
        />

        <SelectField
          name="techSpecsVersion"
          label="Tech Specs Version"
          required
          defaultValue={formData.techSpecsVersion}
          options={VERSION_OPTIONS}
          description={
            <>
              The PACT Technical Specifications describe the PCF data model and
              API requirements that your implementation must conform to. Select
              the version that your solution implements. A given version is in
              beta if the testing suite has not yet been tested by a sufficient
              number of organizations for that version; the tool can
              nevertheless still be used to grant PACT Conformance status, but
              organizations may be subject to mandatory retesting, as per our{" "}
              <a href="https://docs.carbon-transparency.org/">documentation</a>.
            </>
          }
          onChange={handleChange}
        />

        <div className="form-actions">
          <Form.Submit asChild>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Running..." : "Run tests"}
            </Button>
          </Form.Submit>
        </div>
      </Form.Root>
    </div>
  );
};

export default ConformanceTestForm;
