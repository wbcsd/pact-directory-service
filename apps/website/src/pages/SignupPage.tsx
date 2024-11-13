// src/pages/SignupPage.tsx
import React from "react";
import * as Form from "@radix-ui/react-form";
import { Box } from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
const SignupPage: React.FC = () => {
  return (
    <Box
      style={{
        padding: "20px",
        maxWidth: "400px",
        margin: "0 auto",
      }}
    >
      <h2>Sign Up</h2>
      <Form.Root>
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
                <Tooltip.Content side="right" align="center" sideOffset={5}>
                  Your company name as it will appear on the PACT Network (i.e.
                  search, profile pages).
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
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
                <Tooltip.Content side="right" align="center" sideOffset={5}>
                  This is the identifier for your company within the PACT
                  Network.
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
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
                <Tooltip.Content side="right" align="center" sideOffset={5}>
                  Your name as will show up as a point of contact for your
                  organization.
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
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
                <Tooltip.Content side="right" align="center" sideOffset={5}>
                  Your email address will be used to log in to the PACT Network,
                  and to receive important notifications.
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Form.Label>
          <Form.Control asChild>
            <input
              type="email"
              required
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
                <Tooltip.Content side="right" align="center" sideOffset={5}>
                  Your password must be at least 8 characters long.
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Form.Label>
          <Form.Control asChild>
            <input
              type="password"
              required
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
          <Form.Message match="valueMissing" style={{ color: "red" }}>
            Password is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="solutionProdUrl">
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
                <Tooltip.Content side="right" align="center" sideOffset={5}>
                  The production URL for your solution's API.
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
          <Form.Message match="valueMissing" style={{ color: "red" }}>
            Solution API production URL is required.
          </Form.Message>
        </Form.Field>
        <Form.Field name="solutionDevUrl">
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
                <Tooltip.Content side="right" align="center" sideOffset={5}>
                  The development URL for your solution's API.
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
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
                <Tooltip.Content side="right" align="center" sideOffset={5}>
                  The registration code provided by the PACT Network.
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Form.Label>
          <Form.Control asChild>
            <input
              type="text"
              required
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
