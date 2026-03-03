import React, { useEffect, useState } from "react";
import { Button, TextField } from "@radix-ui/themes";
import * as Form from "@radix-ui/react-form";

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

const ConformanceTestForm: React.FC<ConformanceTestFormProps> = ({
  onSubmit,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    const isMobile = window.matchMedia(
      "(max-width: 767px), (pointer: coarse)"
    ).matches;

    if (!isMobile) {
      document
        .querySelectorAll('[class*="rt-TextFieldInput"]')
        .forEach((input) =>
          input.addEventListener("focus", (e) => {
            const scrollTargetElement = document.getElementById(
              (e.target as HTMLInputElement).name
            );
            if (scrollTargetElement) {
              scrollTargetElement.scrollIntoView({ behavior: "smooth" });
            }
          })
        );
    }
  }, []);

  return (
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
          <Button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Running tests..." : "Run tests"}
          </Button>
        </Form.Submit>
      </div>
    </Form.Root>
  );
};

export default ConformanceTestForm;
