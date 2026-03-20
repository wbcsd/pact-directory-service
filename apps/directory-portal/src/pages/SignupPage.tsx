// src/pages/SignupPage.tsx
import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  Text,
  Callout,
  Spinner,
} from "@radix-ui/themes";
import { Link } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { LandingPageLayout } from "../layouts";
import { FormField, TextField } from "../components/ui";

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    organizationName: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [organizationNameExists, setOrganizationNameExists] = useState(false);

  const [creatingAccount, setCreatingAccount] = useState(false);

  const checkOrganizationNameExists = async (name: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API}/directory/organizations/check-name/${encodeURIComponent(name)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.exists;
      } else {
        console.error("Failed to check organization name.");
        return false;
      }
    } catch (error) {
      console.error("An error occurred while checking organization name:", error);
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (organizationNameExists) {
      return;
    }

    const cleanedFormData = {
      ...formData,
      email: formData.email.replace(/\s+/g, ""),
    };

    try {
      setCreatingAccount(true);

      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API}/directory/users/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleanedFormData),
        }
      );

      setCreatingAccount(false);

      if (response.ok) {
        const data = await response.json();
        // Store the verification message from the API
        setSuccessMessage(data.message || "Registration successful. Please check your email to verify your account.");
        setStatus("success");
        // Don't navigate - show verification message instead
      } else {
        const data = await response.json();
        if (data.message) {
          setErrorMessage(data.message);
        }

        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
      console.error("An error occurred:", error);
    }
  };

  const handleOrganizationNameBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const name = e.target.value;

    setOrganizationNameExists(false);

    if (!name) return;

    const organizationExists = await checkOrganizationNameExists(name);
    setOrganizationNameExists(organizationExists);
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  return (
    <LandingPageLayout>

      {status === "success" ? (
        <>
          <Box mb="6">
            <h2>Check Your Email</h2>
          </Box>
          <Callout.Root color="green" variant="surface" mb="6">
            <Callout.Icon>
              <CheckIcon />
            </Callout.Icon>
            <Callout.Text>
              {successMessage}
            </Callout.Text>
          </Callout.Root>
          <Text as="p" size="2" color="gray" mb="4">
            We've sent you a verification link. Please click the link in your email to activate your account and complete the registration process.
          </Text>
          <Box style={{ textAlign: "center" }}>
            <Link to="/login">
              Back to Login
            </Link>
          </Box>
        </>
      ) : (
        <>
          <Box mb="6">
            <h2>Sign up to PACT Network Services</h2>
          </Box>
          <Form.Root onSubmit={handleSubmit}>
              <FormField
                name="organizationName"
                label="Organization Name"
                required
>
                <TextField
                  required
                  value={formData.organizationName}
                  placeholder="Enter organization name"
                  tooltip="The full registered/legal name of your organization."
                  onBlur={handleOrganizationNameBlur}
                  onChange={handleChange}
                />
                { organizationNameExists && 
                <Form.Message>
                  An organization with this name already exists.
                  Please choose a different name or contact its administrator to join.
                </Form.Message>}
              </FormField>

              <FormField
                name="fullName"
                label="Account Admin Full Name"
                required
              >
                <TextField
                  required
                  value={formData.fullName}
                  placeholder="Enter your full name"
                  tooltip="Name of the person / mailbox to serve as account admin and point of contact for your account."
                  onChange={handleChange}
                />
              </FormField>

              <FormField
                name="email"
                label="Account Admin Email"
                required
              >
                <TextField
                  required
                  type="email"
                  value={formData.email}
                  placeholder="Enter your email address"
                  tooltip="Email address of account admin, to be used to log in and receive notifications."
                  onChange={handleChange}
                />
                <Form.Message match="typeMismatch">
                  Invalid email.
                </Form.Message>
              </FormField>

              <FormField
                name="password"
                label="Password"
                required
              >
                <TextField
                  required
                  type="password"
                  value={formData.password}
                  placeholder="Enter password"
                  tooltip="Your password must be at least 6 characters long."
                  minLength={6}
                  onChange={handleChange}
                />
                <Form.Message match="tooShort">
                  Password needs to be at least 6 characters long.
                </Form.Message>
              </FormField>

              <FormField
                name="confirmPassword"
                label="Confirm Password"
                required
              >
                <TextField
                  required
                  type="password"
                  value={formData.confirmPassword}
                  placeholder="Confirm your password"
                  tooltip="Please confirm your password."
                  onChange={handleChange}
                />
                <Form.Message match={(value) => value !== formData.password}>
                  Passwords do not match.
                </Form.Message>
              </FormField>

              <Box>
                <Text size="2" color="gray">
                  By signing up you agree to our{" "}
                  <a href="https://www.carbon-transparency.org/pact-network-services-terms-of-use">
                    <strong>Terms of Use</strong>
                  </a>{" "}
                  and{" "}
                  <a href="https://www.wbcsd.org/privacy-policy/">
                    <strong>Privacy Policy</strong>
                  </a>
                </Text>
              </Box>

              <Box mt="6">
                <Form.Submit asChild>
                  <Button disabled={creatingAccount || organizationNameExists}>
                    {creatingAccount && <Spinner loading />}
                    {creatingAccount ? "Creating Account" : "Join"}
                  </Button>
                </Form.Submit>
              </Box>

              <Box mt="4">
                <Text size="2">
                  Need help? Contact us at:{" "}
                  <a href="mailto:pact-support@wbcsd.org">
                    <strong>pact-support@wbcsd.org</strong>
                  </a>
                </Text>
              </Box>
            </Form.Root>
                {status === "error" && (
                  <Callout.Root
                    color="bronze"
                    highContrast
                    variant="surface"
                    mt={"4"}
                  >
                    <Callout.Icon>
                      <ExclamationTriangleIcon />
                    </Callout.Icon>
                    <Callout.Text>
                      {errorMessage ||
                        "Error during sign up, please check your data."}
                    </Callout.Text>
                  </Callout.Root>
                )}
              </>
            )}

    </LandingPageLayout>
  );
};

export default SignupPage;
