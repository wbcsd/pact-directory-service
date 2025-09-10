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
import { useTranslation } from "react-i18next";
import HeroImage from "../assets/providers-header.webp";

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
            {t("signuppage.hero.title")}
          </h2>
        </Box>
        <Box
          style={{
            padding: "20px",
            margin: "0 auto",
            flex: "1 1 100%",
            background: "#FCFDFF",
            height: "100%",
          }}
        >
          <Box
            style={{ maxWidth: "400px", margin: "0 auto", paddingTop: "40px" }}
          >
            <h2 style={{ marginBottom: "30px" }}>{t("signuppage.title")}</h2>
            <Form.Root onSubmit={handleSubmit}>
              {/* Company Name */}
              <Form.Field name="companyName">
                <Form.Label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  {t("signuppage.fields.companyName.label")}
                  <span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.companyName}
                    required
                    placeholder={t("signuppage.fields.companyName.placeholder")}
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
                            {t("signuppage.fields.companyName.tooltip")}
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
                  {t("signuppage.fields.companyName.required")}
                </Form.Message>
              </Form.Field>

              {/* Full Name */}
              <Form.Field name="fullName">
                <Form.Label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  {t("signuppage.fields.fullName.label")}
                  <span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.fullName}
                    required
                    placeholder={t("signuppage.fields.fullName.placeholder")}
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
                            {t("signuppage.fields.fullName.tooltip")}
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
                  {t("signuppage.fields.fullName.required")}
                </Form.Message>
              </Form.Field>

              {/* Email */}
              <Form.Field name="email">
                <Form.Label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  {t("signuppage.fields.email.label")}
                  <span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.email}
                    required
                    type="email"
                    placeholder={t("signuppage.fields.email.placeholder")}
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
                            {t("signuppage.fields.email.tooltip")}
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
                  {t("signuppage.fields.email.required")}
                </Form.Message>
                <Form.Message
                  match="typeMismatch"
                  style={{
                    color: "var(--base-color-brand--light-blue)",
                    fontSize: "0.85em",
                  }}
                >
                  {t("signuppage.fields.email.invalid")}
                </Form.Message>
              </Form.Field>

              {/* Password */}
              <Form.Field name="password">
                <Form.Label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  {t("signuppage.fields.password.label")}
                  <span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    type="password"
                    value={formData.password}
                    required
                    placeholder={t("signuppage.fields.password.placeholder")}
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
                            {t("signuppage.fields.password.tooltip")}
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
                  {t("signuppage.fields.password.required")}
                </Form.Message>
                <Form.Message
                  match="tooShort"
                  style={{
                    color: "var(--base-color-brand--light-blue)",
                    fontSize: "0.85em",
                  }}
                >
                  {t("signuppage.fields.password.tooShort")}
                </Form.Message>
              </Form.Field>

              {/* Confirm Password */}
              <Form.Field name="confirmPassword">
                <Form.Label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  {t("signuppage.fields.confirmPassword.label")}
                  <span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    type="password"
                    value={formData.confirmPassword}
                    required
                    placeholder={t(
                      "signuppage.fields.confirmPassword.placeholder"
                    )}
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
                            {t("signuppage.fields.confirmPassword.tooltip")}
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
                  {t("signuppage.fields.confirmPassword.required")}
                </Form.Message>
                <Form.Message
                  match={(value) => value !== formData.password}
                  style={{
                    color: "var(--base-color-brand--light-blue)",
                    fontSize: "0.85em",
                  }}
                >
                  {t("signuppage.fields.confirmPassword.mismatch")}
                </Form.Message>
              </Form.Field>

              {/* Terms */}
              <Box>
                <Text
                  style={{
                    color: "var(--base-color-brand--light-blue)",
                    fontSize: "0.90em",
                  }}
                >
                  {t("signuppage.terms")}{" "}
                  <a
                    style={{ fontWeight: "bold" }}
                    href="https://www.carbon-transparency.org/pact-network-services-terms-of-use"
                  >
                    {t("signuppage.terms.termsOfUse")}
                  </a>{" "}
                  {t("signuppage.terms.and")}{" "}
                  <a
                    style={{ fontWeight: "bold" }}
                    href="https://www.wbcsd.org/privacy-policy/"
                  >
                    {t("signuppage.terms.privacyPolicy")}
                  </a>
                </Text>
              </Box>

              {/* Submit */}
              <Box>
                <Form.Submit asChild>
                  <Button
                    disabled={creatingAccount}
                    style={{ width: "100%", marginTop: "40px" }}
                  >
                    {creatingAccount && <Spinner loading />}
                    {creatingAccount
                      ? t("signuppage.actions.creating")
                      : t("signuppage.actions.join")}
                  </Button>
                </Form.Submit>

                <p style={{ fontSize: "0.9em", marginTop: "20px" }}>
                  {t("signuppage.help")}{" "}
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
                  {errorMessage || t("signuppage.error.default")}
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
