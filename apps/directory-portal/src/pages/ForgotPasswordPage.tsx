import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button, TextField, Callout } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import { ExclamationTriangleIcon, CheckIcon } from "@radix-ui/react-icons";
import HeroImage from "../assets/providers-header.webp";
import { useTranslation } from "react-i18next";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_DIRECTORY_API
        }/directory/companies/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      if (response.ok) {
        setStatus("success");
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || t("forgotpassword.errors.generic"));
        setStatus("error");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setErrorMessage(t("forgotpassword.errors.tryAgainLater"));
      setStatus("error");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  return (
    <>
      <Box style={{ display: "flex", width: "100%" }}>
        <Box
          style={{
            width: "589px",
            minWidth: "589px",
            minHeight: "800px",
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
              marginTop: "16%",
              fontSize: "1.8em",
            }}
          >
            {t("forgotpassword.hero.title")}
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
            style={{
              maxWidth: "400px",
              margin: "0 auto",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {status === "success" ? (
              <Box>
                <h2 style={{ marginBottom: "20px", color: "#0A0552" }}>
                  {t("forgotpassword.success.title")}
                </h2>
                <Callout.Root color="green" variant="surface">
                  <Callout.Icon>
                    <CheckIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    {t("forgotpassword.success.message")}
                  </Callout.Text>
                </Callout.Root>
                <Box style={{ marginTop: "30px", textAlign: "center" }}>
                  <Link
                    to="/login"
                    style={{
                      color: "#0A0552",
                      textDecoration: "underline",
                      fontSize: "0.9em",
                    }}
                  >
                    {t("forgotpassword.actions.backToLogin")}
                  </Link>
                </Box>
              </Box>
            ) : (
              <>
                <h2 style={{ marginBottom: "20px" }}>
                  {t("forgotpassword.form.title")}
                </h2>
                <p style={{ marginBottom: "30px", color: "#666" }}>
                  {t("forgotpassword.form.subtitle")}
                </p>

                <Form.Root onSubmit={handleSubmit}>
                  <Form.Field name="email">
                    <Form.Label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                      }}
                    >
                      {t("forgotpassword.form.emailLabel")}
                      <span style={{ color: "red" }}>*</span>
                    </Form.Label>
                    <Form.Control asChild>
                      <TextField.Root
                        type="email"
                        value={email}
                        required
                        placeholder={t("forgotpassword.form.emailPlaceholder")}
                        onChange={handleChange}
                        disabled={status === "loading"}
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
                      {t("forgotpassword.validation.required")}
                    </Form.Message>
                    <Form.Message
                      match="typeMismatch"
                      style={{
                        color: "var(--base-color-brand--light-blue)",
                        fontSize: "0.85em",
                      }}
                    >
                      {t("forgotpassword.validation.invalid")}
                    </Form.Message>
                  </Form.Field>

                  <Box style={{ marginTop: "30px" }}>
                    <Form.Submit asChild>
                      <Button
                        style={{ width: "100%" }}
                        type="submit"
                        disabled={status === "loading"}
                      >
                        {status === "loading"
                          ? t("forgotpassword.actions.sending")
                          : t("forgotpassword.actions.sendLink")}
                      </Button>
                    </Form.Submit>
                  </Box>
                </Form.Root>

                <Box style={{ marginTop: "20px", textAlign: "center" }}>
                  <Link
                    to="/login"
                    style={{
                      color: "#0A0552",
                      textDecoration: "underline",
                      fontSize: "0.9em",
                    }}
                  >
                    {t("forgotpassword.actions.backToLogin")}
                  </Link>
                </Box>

                {status === "error" && (
                  <Callout.Root
                    color="bronze"
                    highContrast
                    variant="surface"
                    style={{ marginTop: "20px" }}
                  >
                    <Callout.Icon>
                      <ExclamationTriangleIcon />
                    </Callout.Icon>
                    <Callout.Text>
                      {errorMessage || t("forgotpassword.errors.generic")}
                    </Callout.Text>
                  </Callout.Root>
                )}

                <p
                  style={{
                    fontSize: "0.9em",
                    marginTop: "30px",
                    textAlign: "center",
                  }}
                >
                  {t("forgotpassword.help.text")}{" "}
                  <a
                    style={{ fontWeight: "bold" }}
                    href="mailto:pact-support@wbcsd.org"
                  >
                    pact-support@wbcsd.org
                  </a>
                </p>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default ForgotPasswordPage;
