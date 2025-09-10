// src/pages/LoginPage.tsx
import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button, TextField, Callout } from "@radix-ui/themes";
import { useNavigate, Link } from "react-router-dom";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import HeroImage from "../assets/providers-header.webp";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API}/directory/companies/login`,
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
          await login(token);
          navigate("/conformance-test-runs");
        } else {
          throw new Error("Token not found in response");
        }
      } else if (response.status === 401) {
        setErrorMessage(t("login.errors.invalidCredentials"));
      } else {
        throw new Error("Failed to login");
      }
    } catch (error) {
      console.error("Error during login:", error);
      setErrorMessage(t("login.errors.generic"));
    }
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
            {t("login.hero.title")}
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
            <h2 style={{ marginBottom: "30px" }}>{t("login.title")}</h2>
            <Form.Root onSubmit={handleSubmit}>
              <Form.Field name="email">
                <Form.Label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  {t("login.form.emailLabel")}
                  <span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    type="email"
                    value={formData.email}
                    required
                    placeholder={t("login.form.emailPlaceholder")}
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
                  {t("login.validation.emailRequired")}
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
                  {t("login.form.passwordLabel")}
                  <span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    type="password"
                    value={formData.password}
                    required
                    placeholder={t("login.form.passwordPlaceholder")}
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
                  {t("login.validation.passwordRequired")}
                </Form.Message>
              </Form.Field>

              <Box>
                <Form.Submit asChild>
                  <Button
                    style={{ width: "100%", marginTop: "40px" }}
                    type="submit"
                  >
                    {t("login.actions.submit")}
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
                    {t("login.actions.forgotPassword")}
                  </Link>
                </Box>

                <p style={{ fontSize: "0.9em", marginTop: "20px" }}>
                  {t("login.help.text")}{" "}
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
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default LoginPage;
