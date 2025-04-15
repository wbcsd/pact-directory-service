import React, { useState } from "react";
import { Button, TextField } from "@radix-ui/themes";
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
    apiUrl,
    authBaseUrl,
    clientId,
    clientSecret,
    version,
  } = useConformanceTesting();

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    solutionApiUrl: apiUrl,
    authBaseUrl: authBaseUrl,
    clientId: clientId,
    clientSecret: clientSecret,
    techSpecsVersion: version,
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

    navigate("/conformance-test-result");
  };

  return (
    <>
      <aside className="sidebar">
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <h2>Conformance Testing</h2>
        </div>

        <Form.Root onSubmit={handleSubmit}>
          <Form.Field name="solutionApiUrl">
            <Form.Control asChild>
              <TextField.Root
                value={formData.solutionApiUrl}
                required
                placeholder="Enter Solution API Base URL"
                onChange={handleChange}
              >
                <TextField.Slot />
              </TextField.Root>
            </Form.Control>
          </Form.Field>

          <Form.Field name="authBaseUrl">
            <Form.Control asChild>
              <TextField.Root
                value={formData.authBaseUrl}
                placeholder="Enter Auth Base URL (optional)"
                onChange={handleChange}
              >
                <TextField.Slot />
              </TextField.Root>
            </Form.Control>
          </Form.Field>

          <Form.Field name="clientId">
            <Form.Control asChild>
              <TextField.Root
                value={formData.clientId}
                required
                placeholder="Enter Client ID"
                onChange={handleChange}
              >
                <TextField.Slot />
              </TextField.Root>
            </Form.Control>
          </Form.Field>

          <Form.Field name="clientSecret">
            <Form.Control asChild>
              <TextField.Root
                value={formData.clientSecret}
                required
                placeholder="Enter Client Secret"
                onChange={handleChange}
              >
                <TextField.Slot />
              </TextField.Root>
            </Form.Control>
          </Form.Field>

          <Form.Field name="techSpecsVersion">
            <Form.Label>Tech Specs Version</Form.Label>
            <Form.Control asChild>
              <select
                onChange={handleChange}
                required
                style={{ padding: "8px", borderRadius: "4px" }}
                defaultValue={formData.techSpecsVersion}
              >
                <option value="V2.0">2.0</option>
                <option value="V2.1">2.1</option>
                <option value="V2.2">2.2</option>
                <option value="V2.3">2.3</option>
              </select>
            </Form.Control>
          </Form.Field>

          <Form.Submit asChild>
            <Button type="submit">Run tests</Button>
          </Form.Submit>
        </Form.Root>
      </main>
    </>
  );
};

export default ConformanceTesting;
