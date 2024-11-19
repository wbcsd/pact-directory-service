// src/pages/SignupPage.tsx
import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Box } from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useNavigate } from "react-router-dom";

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
        "http://localhost:3010/api/directory/companies/signup",
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
        maxWidth: "400px",
        margin: "0 auto",
      }}
    >
      <h2>Sign Up</h2>
      <Form.Root onSubmit={handleSubmit}>
        <Form.Field name="companyName">
          <Form.Label>
            Company Name
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
                  Your company name as it will appear on the PACT Network (i.e.
                  search, profile pages).
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={handleChange}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
          <Form.Message match="valueMissing" style={{ color: "red" }}>
            Company name is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="companyIdentifier">
          <Form.Label>
            Company Identifier
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
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
              value={formData.companyIdentifier}
              onChange={handleChange}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
          <Form.Message match="valueMissing" style={{ color: "red" }}>
            Company identifier is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="fullName">
          <Form.Label>
            Full Name
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
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={handleChange}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
          <Form.Message match="valueMissing" style={{ color: "red" }}>
            Your name is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="email">
          <Form.Label>
            Email
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
                  Your email address will be used to log in to the PACT Network,
                  and to receive important notifications.
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Form.Label>
          <Form.Control asChild>
            <input
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
          <Form.Message match="valueMissing" style={{ color: "red" }}>
            Email is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="password">
          <Form.Label>
            Password
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
          </Form.Label>
          <Form.Control asChild>
            <input
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
          <Form.Message match="valueMissing" style={{ color: "red" }}>
            Password is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="confirmPassword">
          <Form.Label>
            Confirm Password
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
          </Form.Label>
          <Form.Control asChild>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
          <Form.Message match="valueMissing" style={{ color: "red" }}>
            Please confirm your password.
          </Form.Message>
          <Form.Message
            match={(value) => value !== formData.password}
            style={{ color: "red" }}
          >
            Passwords do not match.
          </Form.Message>
        </Form.Field>
        <Form.Field name="solutionApiProdUrl">
          <Form.Label>
            Solution Api Production URL
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
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
              value={formData.solutionApiProdUrl}
              onChange={handleChange}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
          <Form.Message match="valueMissing" style={{ color: "red" }}>
            Solution API production URL is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="solutionApiDevUrl">
          <Form.Label>
            Solution Api Development URL
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
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
              value={formData.solutionApiDevUrl}
              onChange={handleChange}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
          <Form.Message match="valueMissing" style={{ color: "red" }}>
            Solution API development URL is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="registrationCode">
          <Form.Label>
            Registration Code
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
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
              value={formData.registrationCode}
              onChange={handleChange}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
          <Form.Message match="valueMissing" style={{ color: "red" }}>
            Registration code is required.
          </Form.Message>
        </Form.Field>
        <Form.Submit asChild>
          <button type="submit" style={{ marginTop: "10px" }}>
            Join the network!
          </button>
        </Form.Submit>
      </Form.Root>
    </Box>
  );
};

export default SignupPage;
