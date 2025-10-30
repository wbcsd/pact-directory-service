// src/pages/LoginPage.tsx
import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button, TextField, Callout } from "@radix-ui/themes";
import { useNavigate, Link } from "react-router-dom";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useAuth } from "../contexts/AuthContext";
import useBodyOverflow from "../utils/use-body-overflow";
import { LandingPageLayout } from "../layouts";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");

  useBodyOverflow(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
{/* [Content> */}
      <h2 style={{ marginBottom: "30px" }}>
        Log in to PACT Network Services
      </h2>
      <Form.Root onSubmit={handleSubmit}>
        <Form.Field name="email">
          <Form.Label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "500",
            }}
          >
            Email Address<span style={{ color: "red" }}>*</span>
          </Form.Label>
          <Form.Control asChild>
            <TextField.Root
              type="email"
              value={formData.email}
              required
              placeholder="Enter your email"
              onChange={handleChange}
              style={{
                width: "100%",
                border: "1px solid #ccc",
                padding: "12px",
                fontSize: "16px",
              }}
            />
          </Form.Control>
          <Form.Message
            match="valueMissing"
            style={{
              color: "var(--base-color-brand--light-blue)",
              fontSize: "0.85em",
            }}
          >
                  Email is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="password" style={{ marginTop: "16px" }}>
          <Form.Label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "500",
            }}
          >
            Password<span style={{ color: "red" }}>*</span>
          </Form.Label>
          <Form.Control asChild>
            <TextField.Root
              type="password"
              value={formData.password}
              required
              placeholder="Enter your password"
              onChange={handleChange}
              style={{
                width: "100%",
                border: "1px solid #ccc",
                padding: "12px",
                fontSize: "16px",
              }}
            />
          </Form.Control>
          <Form.Message
            match="valueMissing"
            style={{
              color: "var(--base-color-brand--light-blue)",
              fontSize: "0.85em",
            }}
          >
            Password is required.
          </Form.Message>
        </Form.Field>

        <Box>
          <Form.Submit asChild>
            <Button
              style={{ width: "100%", marginTop: "40px" }}
              type="submit"
            >
              Login
            </Button>
          </Form.Submit>

          <Box style={{ textAlign: "center", marginTop: "20px" }}>
            <Link
              to="/forgot-password"
              style={{
                color: "#0A0552",
                textDecoration: "underline",
                fontSize: "0.9em",
              }}
            >
              Forgot your password?
            </Link>
          </Box>

          <p style={{ fontSize: "0.9em", marginTop: "20px" }}>
            Need help? Contact us at:{" "}
            <a
              style={{ fontWeight: "bold" }}
              href="mailto:pact-support@wbcsd.org"
            >
              pact-support@wbcsd.org
            </a>
          </p>
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
{/* <Content] */}
    </LandingPageLayout>
  );
};

export default LoginPage;
