import React, { useState } from "react";
import { Button } from "@radix-ui/themes";
import * as Form from "@radix-ui/react-form";
import { FormField, TextField, SelectField } from "./ui";

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
  { value: "V2.0", label: "2.0" },
  { value: "V2.1", label: "2.1" },
  { value: "V2.2", label: "2.2" },
  { value: "V2.3", label: "2.3" },
  { value: "V3.0", label: "3.0" },
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
        <FormField           
          name="solutionApiUrl"
          label="Solution API Base URL"
          required>
          <TextField
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
          <Form.Message className="FormMessage" match="valueMissing">
            Please provide a valid URL
          </Form.Message>
        </FormField>

        <FormField
          name="authBaseUrl"
          label="Auth Base URL">
          <TextField
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
        </FormField>

        <FormField 
          name="clientId"
          label="Client ID"
          required
          description="
            Provide the Client ID that will be used to authenticate API requests 
            during conformance testing. This ID should have sufficient permissions
            to access all endpoints required by the PACT specification.">
          <TextField
            required
            value={formData.clientId}
            placeholder="Client ID used for authentication by ACT"
            onChange={handleChange}
          />
        </FormField>

        <FormField
          name="clientSecret"
          label="Client Secret"
          required
          description="
            Enter the Client Secret associated with your Client ID. 
            This will be used along with the Client ID to obtain access tokens 
            for authenticated API requests during testing.">
          <TextField
            required
            value={formData.clientSecret}
            placeholder="Secret used for authentication by ACT"
            onChange={handleChange}
          />
        </FormField>

        <FormField
          name="authOptionsScope"
          label="Scope"
          description="
            Common OAuth options like Scope, Resource and Audience are also 
            available for configuration. Make sure to set these according to 
            your API's requirements.">
          <TextField
            value={formData.authOptionsScope}
            placeholder="Scope used for authentication"
            onChange={handleChange}
          />
        </FormField>

        <FormField
          name="authOptionsAudience"
          label="Audience">
          <TextField
            value={formData.authOptionsAudience}
            placeholder="Audience used for authentication"
            onChange={handleChange}
          />
        </FormField>

        <FormField           
          name="authOptionsResource"
          label="Resource"
        >
          <TextField 
            placeholder="Resource used for authentication"
            value={formData.authOptionsResource}
            onChange={handleChange}
          />
          <Form.Message className="FormMessage" match="valueMissing">
            Please provide a resource
          </Form.Message>
        </FormField>

        <FormField 
          name="techSpecsVersion" 
          label="Tech Specs Version" 
          required
          description={<>
            The PACT Technical Specifications describe the PCF data model and
            API requirements that your implementation must conform to. Select
            the version that your solution implements. A given version is in
            beta if the testing suite has not yet been tested by a sufficient
            number of organizations for that version; the tool can
            nevertheless still be used to grant PACT Conformance status, but
            organizations may be subject to mandatory retesting, as per our{" "}
            <a href="https://docs.carbon-transparency.org/">documentation</a>.
            </>}>
          <SelectField
            defaultValue={formData.techSpecsVersion}
            options={VERSION_OPTIONS}
            onValueChange={techSpecsVersion => setFormData((prevData) => ({ ...prevData, techSpecsVersion }))}
          />
        </FormField>

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
