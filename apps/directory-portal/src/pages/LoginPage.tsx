// src/pages/LoginPage.tsx
import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button, Callout, Text } from "@radix-ui/themes";
import { useNavigate, Link } from "react-router-dom";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useAuth } from "../contexts/AuthContext";
import { LandingPageLayout } from "../layouts";
import { FormField, TextField } from "../components/ui";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [unverifiedMessage, setUnverifiedMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setUnverifiedMessage("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API}/directory/users/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const { token } = data;

        if (token) {
          // Use the login function from AuthContext which will:
          // 1. Store the token
          // 2. Fetch and store the profile data
          await login(token);
          navigate("/conformance-test-runs");
        } else {
          throw new Error("Token not found in response");
        }
      } else if (response.status === 401) {
        setErrorMessage("Invalid email or password");
      } else if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data?.name === "EmailNotVerifiedError") {
          setUnverifiedMessage("Your email address has not been verified yet. Please check your inbox for the verification link.");
        } else {
          setErrorMessage(data?.message || "Access denied");
        }
      } else {
        throw new Error("Failed to login");
      }
    } catch (error) {
      console.error("Error during login:", error);
      setErrorMessage("An error occurred during login");
    }
  };

  return (
    <LandingPageLayout>

      <Box mb="6">
        <h2>Log in to PACT Network Services</h2>
      </Box>
      <Form.Root onSubmit={handleSubmit}>
        <FormField
          name="email"
          label="Email Address"
          required
        >
          <TextField
            required
            type="email"
            value={formData.email}
            placeholder="Enter your email"
            onChange={handleChange}
          />
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
            placeholder="Enter your password"
            onChange={handleChange}
          />
        </FormField>

        <Box>
          <Form.Submit asChild>
            <Button type="submit">
              Login
            </Button>
          </Form.Submit>

          <Box mt="6">
            <Link to="/forgot-password">
              Forgot your password?
            </Link>
          </Box>

          <Box mt="6">
            <Text>Need help? Contact us at </Text>
            <a href="mailto:pact-support@wbcsd.org">
              pact-support@wbcsd.org
            </a>
          </Box>
        </Box>
      </Form.Root>
      {errorMessage && (
        <Callout.Root
          color="bronze"
          highContrast
          variant="surface"
          mt={"4"}
        >
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{errorMessage}</Callout.Text>
        </Callout.Root>
      )}

      {unverifiedMessage && (
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
            {unverifiedMessage}{" "}
            <Link
              to={`/resend-verification?email=${encodeURIComponent(formData.email)}`}
            >
              Resend verification email
            </Link>
            .
          </Callout.Text>
        </Callout.Root>
      )}

    </LandingPageLayout>
  );
};

export default LoginPage;
