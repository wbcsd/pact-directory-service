// src/pages/SignupPage.tsx
import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  TextField,
  Text,
  Callout,
  Spinner,
} from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useNavigate } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import HeroImage from "../assets/providers-header.webp";

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: "",
    companyIdentifier: "",
    companyIdentifierDescription: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    solutionApiUrl: "",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);

  const [errorMessage, setErrorMessage] = useState("");

  const [creatingAccount, setCreatingAccount] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanedFormData = {
      ...formData,
      email: formData.email.replace(/\s+/g, ""),
    };

    try {
      setCreatingAccount(true);

      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API}/directory/companies/signup`,
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
        const { token } = data;

        localStorage.setItem("jwt", token);

        setStatus("success");

        navigate("/conformance-test-runs");
      } else {
        const errorResponse = await response.json();

        if (errorResponse.error) {
          setErrorMessage(errorResponse.error);
        }

        setStatus("error");
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
    <>
      <Box style={{ display: "flex", width: "100%" }}>
        <Box
          style={{
            width: "589px",
            minWidth: "589px",
            background: "#0A0552",
            height: "100%",
            backgroundImage: `url(${HeroImage})`,
            backgroundPosition: "bottom",
            backgroundSize: "180% auto",
            backgroundRepeat: "no-repeat",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              color: "#FFFFFF",
              width: "360px",
              margin: "0 auto",
              marginTop: "200px",
              fontSize: "1.8em",
            }}
          >
            Helping you adopt PACT standards with ease
          </h2>
        </Box>
        <Box
          style={{
            padding: "20px",
            // maxWidth: "650px",
            margin: "0 auto",
            flex: "1 1 100%",
            background: "#FCFDFF",
            height: "100%",
          }}
        >
          <Box
            style={{ maxWidth: "400px", margin: "0 auto", paddingTop: "40px" }}
          >
            <h2 style={{ marginBottom: "30px" }}>
              Sign up to PACT Network Services
            </h2>
            <Form.Root onSubmit={handleSubmit}>
              <Form.Field name="companyName">
                <Form.Label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Company Name<span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.companyName}
                    required
                    placeholder="Enter company name"
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      border: "1px solid #ccc",
                      padding: "12px",
                      fontSize: "16px",
                    }}
                  >
                    <TextField.Slot side="right">
                      <Tooltip.Provider delayDuration={0}>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <InfoCircledIcon
                              width={20}
                              height={20}
                              color="#0A0552"
                              style={{ cursor: "pointer" }}
                            />
                          </Tooltip.Trigger>
                          <Tooltip.Content
                            className="TooltipContent"
                            side="right"
                            align="center"
                            sideOffset={5}
                          >
                            The full registered/legal name of your company.
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

              <Form.Field name="fullName">
                <Form.Label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Account Admin Full Name<span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.fullName}
                    required
                    placeholder="Enter your full name"
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      border: "1px solid #ccc",
                      padding: "12px",
                      fontSize: "16px",
                    }}
                  >
                    <TextField.Slot side="right">
                      <Tooltip.Provider delayDuration={0}>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <InfoCircledIcon
                              width={20}
                              height={20}
                              color="#0A0552"
                              style={{ cursor: "pointer" }}
                            />
                          </Tooltip.Trigger>
                          <Tooltip.Content
                            className="TooltipContent"
                            side="right"
                            align="center"
                            sideOffset={5}
                          >
                            Name of the person / mailbox to serve as account
                            admin and point of contact for your account.
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
                <Form.Label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Account Admin Email<span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.email}
                    required
                    type="email"
                    placeholder="Enter your email address"
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      border: "1px solid #ccc",
                      padding: "12px",
                      fontSize: "16px",
                    }}
                  >
                    <TextField.Slot side="right">
                      <Tooltip.Provider delayDuration={0}>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <InfoCircledIcon
                              width={20}
                              height={20}
                              color="#0A0552"
                              style={{ cursor: "pointer" }}
                            />
                          </Tooltip.Trigger>
                          <Tooltip.Content
                            className="TooltipContent"
                            side="right"
                            align="center"
                            sideOffset={5}
                          >
                            Email address of account admin, to be used to log in
                            and receive notifications.
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
                <Form.Message
                  match="typeMismatch"
                  style={{
                    color: "var(--base-color-brand--light-blue)",
                    fontSize: "0.85em",
                  }}
                >
                  Invalid email.
                </Form.Message>
              </Form.Field>

              <Form.Field name="password">
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
                    placeholder="Enter password"
                    onChange={handleChange}
                    minLength={6}
                    style={{
                      width: "100%",
                      border: "1px solid #ccc",
                      padding: "12px",
                      fontSize: "16px",
                    }}
                  >
                    <TextField.Slot side="right">
                      <Tooltip.Provider delayDuration={0}>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <InfoCircledIcon
                              width={20}
                              height={20}
                              color="#0A0552"
                              style={{ cursor: "pointer" }}
                            />
                          </Tooltip.Trigger>
                          <Tooltip.Content
                            className="TooltipContent"
                            side="right"
                            align="center"
                            sideOffset={5}
                          >
                            Your password must be at least 6 characters long.
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
                <Form.Message
                  match="tooShort"
                  style={{
                    color: "var(--base-color-brand--light-blue)",
                    fontSize: "0.85em",
                  }}
                >
                  Password needs to be at least 6 characters long.
                </Form.Message>
              </Form.Field>

              <Form.Field name="confirmPassword">
                <Form.Label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Confirm Password<span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    type="password"
                    value={formData.confirmPassword}
                    required
                    placeholder="Confirm your password"
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      border: "1px solid #ccc",
                      padding: "12px",
                      fontSize: "16px",
                    }}
                  >
                    <TextField.Slot side="right">
                      <Tooltip.Provider delayDuration={0}>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <InfoCircledIcon
                              width={20}
                              height={20}
                              color="#0A0552"
                              style={{ cursor: "pointer" }}
                            />
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
              <Box>
                <Text
                  style={{
                    color: "var(--base-color-brand--light-blue)",
                    fontSize: "0.90em",
                  }}
                >
                  By signing up you agree to our{" "}
                  <a
                    style={{ fontWeight: "bold" }}
                    href="https://www.carbon-transparency.org/pact-network-services-terms-of-use"
                  >
                    Terms of Use
                  </a>{" "}
                  and{" "}
                  <a
                    style={{ fontWeight: "bold" }}
                    href="https://www.wbcsd.org/privacy-policy/"
                  >
                    Privacy Policy
                  </a>
                </Text>
              </Box>
              <Box>
                <Form.Submit asChild>
                  <Button
                    disabled={creatingAccount}
                    style={{ width: "100%", marginTop: "40px" }}
                  >
                    {creatingAccount && <Spinner loading />}
                    {creatingAccount ? "Creating Account" : "Join"}
                  </Button>
                </Form.Submit>

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
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default SignupPage;
