// src/pages/SignupPage.tsx
import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button, TextField, Text, Flex } from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Link, useNavigate } from "react-router-dom";

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: "",
    companyIdentifier: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    solutionApiProdUrl: "",
    solutionApiDevUrl: "",
    registrationCode: "",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      console.log("Submitting form data:", formData);

      // TODO: store api url properly in .env
      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API_URL}/companies/signup`,
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

        // Save the token to local storage
        localStorage.setItem("jwt", token);

        setStatus("success");
        console.log("Registration successful");

        navigate("/my-profile");
      } else {
        setStatus("error");
        console.error("Registration failed");
      }
    } catch (error) {
      setStatus("error");
      console.error("An error occurred:", error);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  return (
    <Box
      style={{
        padding: "20px",
        maxWidth: "650px",
        margin: "0 auto",
      }}
    >
      <h2>Sign Up</h2>
      <Form.Root onSubmit={handleSubmit}>
        <Form.Field name="companyName">
          <Form.Control asChild>
            <TextField.Root
              value={formData.companyName}
              required
              placeholder="Company Name"
              onChange={handleChange}
            >
              <TextField.Slot side="right">
                <Tooltip.Provider delayDuration={0}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        style={{
                          marginLeft: "8px",
                          cursor: "pointer",
                          fontSize: "16px",
                          color: "#888",
                        }}
                      >
                        ℹ️
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="TooltipContent"
                      side="right"
                      align="center"
                      sideOffset={5}
                    >
                      Your company name as it will appear on the PACT Network
                      (i.e. search, profile pages).
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </TextField.Slot>
            </TextField.Root>
          </Form.Control>
          <Form.Message
            match="valueMissing"
            style={{
              color: "var(--base-color-brand--light-blue)",
              fontSize: "0.85em",
            }}
          >
            Company name is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="companyIdentifier">
          <Form.Control asChild>
            <TextField.Root
              value={formData.companyIdentifier}
              required
              placeholder="Company Identifier"
              onChange={handleChange}
            >
              <TextField.Slot side="right">
                <Tooltip.Provider delayDuration={0}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        style={{
                          marginLeft: "8px",
                          cursor: "pointer",
                          fontSize: "16px",
                          color: "#888",
                        }}
                      >
                        ℹ️
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="TooltipContent"
                      side="right"
                      align="center"
                      sideOffset={5}
                    >
                      This is the identifier for your company within the PACT
                      Network.
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </TextField.Slot>
            </TextField.Root>
          </Form.Control>
          <Form.Message
            match="valueMissing"
            style={{
              color: "var(--base-color-brand--light-blue)",
              fontSize: "0.85em",
            }}
          >
            Company identifier is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="fullName">
          <Form.Control asChild>
            <TextField.Root
              value={formData.fullName}
              required
              placeholder="Full Name"
              onChange={handleChange}
            >
              <TextField.Slot side="right">
                <Tooltip.Provider delayDuration={0}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        style={{
                          marginLeft: "8px",
                          cursor: "pointer",
                          fontSize: "16px",
                          color: "#888",
                        }}
                      >
                        ℹ️
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="TooltipContent"
                      side="right"
                      align="center"
                      sideOffset={5}
                    >
                      Your name as will show up as a point of contact for your
                      organization.
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </TextField.Slot>
            </TextField.Root>
          </Form.Control>
          <Form.Message
            match="valueMissing"
            style={{
              color: "var(--base-color-brand--light-blue)",
              fontSize: "0.85em",
            }}
          >
            Your name is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="email">
          <Form.Control asChild>
            <TextField.Root
              value={formData.email}
              required
              placeholder="Email"
              onChange={handleChange}
            >
              <TextField.Slot side="right">
                <Tooltip.Provider delayDuration={0}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        style={{
                          marginLeft: "8px",
                          cursor: "pointer",
                          fontSize: "16px",
                          color: "#888",
                        }}
                      >
                        ℹ️
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="TooltipContent"
                      side="right"
                      align="center"
                      sideOffset={5}
                    >
                      Your email address will be used to log in to the PACT
                      Network, and to receive important notifications.
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </TextField.Slot>
            </TextField.Root>
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
        <Form.Field name="password">
          <Form.Control asChild>
            <TextField.Root
              type="password"
              value={formData.password}
              required
              placeholder="Password"
              onChange={handleChange}
            >
              <TextField.Slot side="right">
                <Tooltip.Provider delayDuration={0}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        style={{
                          marginLeft: "8px",
                          cursor: "pointer",
                          fontSize: "16px",
                          color: "#888",
                        }}
                      >
                        ℹ️
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="TooltipContent"
                      side="right"
                      align="center"
                      sideOffset={5}
                    >
                      Your password must be at least 8 characters long.
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </TextField.Slot>
            </TextField.Root>
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
        <Form.Field name="confirmPassword">
          <Form.Control asChild>
            <TextField.Root
              type="password"
              value={formData.confirmPassword}
              required
              placeholder="Confirm Password"
              onChange={handleChange}
            >
              <TextField.Slot side="right">
                <Tooltip.Provider delayDuration={0}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        style={{
                          marginLeft: "8px",
                          cursor: "pointer",
                          fontSize: "16px",
                          color: "#888",
                        }}
                      >
                        ℹ️
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="TooltipContent"
                      side="right"
                      align="center"
                      sideOffset={5}
                    >
                      Please confirm your password.
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </TextField.Slot>
            </TextField.Root>
          </Form.Control>
          <Form.Message
            match="valueMissing"
            style={{
              color: "var(--base-color-brand--light-blue)",
              fontSize: "0.85em",
            }}
          >
            Please confirm your password.
          </Form.Message>
          <Form.Message
            match={(value) => value !== formData.password}
            style={{
              color: "var(--base-color-brand--light-blue)",
              fontSize: "0.85em",
            }}
          >
            Passwords do not match.
          </Form.Message>
        </Form.Field>
        <Form.Field name="solutionApiProdUrl">
          <Form.Control asChild>
            <TextField.Root
              value={formData.solutionApiProdUrl}
              required
              placeholder="Solution API Production URL"
              onChange={handleChange}
            >
              <TextField.Slot side="right">
                <Tooltip.Provider delayDuration={0}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        style={{
                          marginLeft: "8px",
                          cursor: "pointer",
                          fontSize: "16px",
                          color: "#888",
                        }}
                      >
                        ℹ️
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="TooltipContent"
                      side="right"
                      align="center"
                      sideOffset={5}
                    >
                      The production URL for your solution's API.
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </TextField.Slot>
            </TextField.Root>
          </Form.Control>
          <Form.Message
            match="valueMissing"
            style={{
              color: "var(--base-color-brand--light-blue)",
              fontSize: "0.85em",
            }}
          >
            Solution API production URL is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="solutionApiDevUrl">
          <Form.Control asChild>
            <TextField.Root
              value={formData.solutionApiDevUrl}
              required
              placeholder="Solution API Development URL"
              onChange={handleChange}
            >
              <TextField.Slot side="right">
                <Tooltip.Provider delayDuration={0}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        style={{
                          marginLeft: "8px",
                          cursor: "pointer",
                          fontSize: "16px",
                          color: "#888",
                        }}
                      >
                        ℹ️
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="TooltipContent"
                      side="right"
                      align="center"
                      sideOffset={5}
                    >
                      The development URL for your solution's API.
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </TextField.Slot>
            </TextField.Root>
          </Form.Control>
          <Form.Message
            match="valueMissing"
            style={{
              color: "var(--base-color-brand--light-blue)",
              fontSize: "0.85em",
            }}
          >
            Solution API development URL is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="registrationCode">
          <Form.Control asChild>
            <TextField.Root
              value={formData.registrationCode}
              required
              placeholder="Registration Code"
              onChange={handleChange}
            >
              <TextField.Slot side="right">
                <Tooltip.Provider delayDuration={0}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        style={{
                          marginLeft: "8px",
                          cursor: "pointer",
                          fontSize: "16px",
                          color: "#888",
                        }}
                      >
                        ℹ️
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="TooltipContent"
                      side="right"
                      align="center"
                      sideOffset={5}
                    >
                      The registration code provided by the PACT Network.
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </TextField.Slot>
            </TextField.Root>
          </Form.Control>
          <Form.Message
            match="valueMissing"
            style={{
              color: "var(--base-color-brand--light-blue)",
              fontSize: "0.85em",
            }}
          >
            Registration code is required.
          </Form.Message>
        </Form.Field>
        <Flex gap={"3"}>
          <Box>
            <Form.Submit asChild>
              <Button>Join the network!</Button>
            </Form.Submit>
          </Box>
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "var(--base-color-brand--light-blue)",
                fontSize: "0.90em",
              }}
            >
              Already a member? <Link to={"/login"}>Login</Link>
            </Text>
          </Box>
        </Flex>
      </Form.Root>
    </Box>
  );
};

export default SignupPage;
