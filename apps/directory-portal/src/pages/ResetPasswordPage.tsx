import React, { useState, useEffect } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button, TextField, Callout, Spinner } from "@radix-ui/themes";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ExclamationTriangleIcon, CheckIcon } from "@radix-ui/react-icons";
import HeroImage from "../assets/providers-header.webp";
import { useTranslation } from "react-i18next";

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [tokenStatus, setTokenStatus] = useState<
    "verifying" | "valid" | "invalid"
  >("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenStatus("invalid");
        setErrorMessage(t("resetpassword.errors.invalidLink"));
        return;
      }

      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_DIRECTORY_API
          }/directory/companies/verify-reset-token/${token}`
        );

        if (response.ok) {
          setTokenStatus("valid");
        } else {
          const errorData = await response.json();
          setTokenStatus("invalid");
          setErrorMessage(
            errorData.error || t("resetpassword.errors.expiredLink")
          );
        }
      } catch (error) {
        console.error("Token verification error:", error);
        setTokenStatus("invalid");
        setErrorMessage(t("resetpassword.errors.verification"));
      }
    };

    verifyToken();
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage(t("resetpassword.errors.passwordMismatch"));
      setStatus("error");
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage(t("resetpassword.errors.passwordTooShort"));
      setStatus("error");
      return;
    }

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_DIRECTORY_API
        }/directory/companies/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          }),
        }
      );

      if (response.ok) {
        setStatus("success");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || t("resetpassword.errors.generic"));
        setStatus("error");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setErrorMessage(t("resetpassword.errors.tryAgain"));
      setStatus("error");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  if (tokenStatus === "verifying") {
    return (
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
            {t("resetpassword.hero.title")}
          </h2>
        </Box>
        <Box
          style={{
            padding: "20px",
            margin: "0 auto",
            flex: "1 1 100%",
            background: "#FCFDFF",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box style={{ textAlign: "center" }}>
            <Spinner size="3" />
            <p style={{ marginTop: "20px" }}>{t("resetpassword.verifying")}</p>
          </Box>
        </Box>
      </Box>
    );
  }

  if (tokenStatus === "invalid") {
    return (
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
            {t("resetpassword.hero.title")}
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
            <h2 style={{ marginBottom: "20px", color: "#0A0552" }}>
              {t("resetpassword.invalid.title")}
            </h2>
            <Callout.Root color="bronze" variant="surface">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                {errorMessage || t("resetpassword.invalid.description")}
              </Callout.Text>
            </Callout.Root>
            <Box style={{ marginTop: "30px", textAlign: "center" }}>
              <Link
                to="/forgot-password"
                style={{
                  color: "#0A0552",
                  textDecoration: "underline",
                  fontWeight: "500",
                }}
              >
                {t("resetpassword.invalid.requestNew")}
              </Link>
              <br />
              <Link
                to="/login"
                style={{
                  color: "#666",
                  textDecoration: "underline",
                  fontSize: "0.9em",
                  marginTop: "10px",
                  display: "inline-block",
                }}
              >
                {t("resetpassword.invalid.backToLogin")}
              </Link>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

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
            {t("resetpassword.hero.title")}
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
                  {t("resetpassword.success.title")}
                </h2>
                <Callout.Root color="green" variant="surface">
                  <Callout.Icon>
                    <CheckIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    {t("resetpassword.success.description")}
                  </Callout.Text>
                </Callout.Root>
                <Box style={{ marginTop: "30px", textAlign: "center" }}>
                  <Link
                    to="/login"
                    style={{
                      color: "#0A0552",
                      textDecoration: "underline",
                      fontWeight: "500",
                    }}
                  >
                    {t("resetpassword.success.goToLogin")}
                  </Link>
                </Box>
              </Box>
            ) : (
              <>
                <h2 style={{ marginBottom: "20px" }}>
                  {t("resetpassword.form.title")}
                </h2>
                <p style={{ marginBottom: "30px", color: "#666" }}>
                  {t("resetpassword.form.subtitle")}
                </p>

                <Form.Root onSubmit={handleSubmit}>
                  <Form.Field name="password">
                    <Form.Label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                      }}
                    >
                      {t("resetpassword.form.newPassword")}
                      <span style={{ color: "red" }}>*</span>
                    </Form.Label>
                    <Form.Control asChild>
                      <TextField.Root
                        type="password"
                        name="password"
                        value={formData.password}
                        required
                        minLength={6}
                        placeholder={t(
                          "resetpassword.form.newPasswordPlaceholder"
                        )}
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
                      {t("resetpassword.validation.required")}
                    </Form.Message>
                    <Form.Message
                      match="tooShort"
                      style={{
                        color: "var(--base-color-brand--light-blue)",
                        fontSize: "0.85em",
                      }}
                    >
                      {t("resetpassword.validation.tooShort")}
                    </Form.Message>
                  </Form.Field>

                  <Form.Field
                    name="confirmPassword"
                    style={{ marginTop: "16px" }}
                  >
                    <Form.Label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                      }}
                    >
                      {t("resetpassword.form.confirmPassword")}
                      <span style={{ color: "red" }}>*</span>
                    </Form.Label>
                    <Form.Control asChild>
                      <TextField.Root
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        required
                        placeholder={t(
                          "resetpassword.form.confirmPasswordPlaceholder"
                        )}
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
                      {t("resetpassword.validation.confirmRequired")}
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
                          ? t("resetpassword.actions.resetting")
                          : t("resetpassword.actions.submit")}
                      </Button>
                    </Form.Submit>
                  </Box>
                </Form.Root>

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
                      {errorMessage || t("resetpassword.errors.generic")}
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
                  {t("resetpassword.help.text")}{" "}
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

export default ResetPasswordPage;
