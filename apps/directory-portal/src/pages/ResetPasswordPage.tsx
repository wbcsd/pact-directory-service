import React, { useState, useEffect } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button, TextField, Callout, Spinner } from "@radix-ui/themes";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ExclamationTriangleIcon, CheckIcon } from "@radix-ui/react-icons";
import HeroImage from "../assets/providers-header.webp";

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
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
        setErrorMessage("Invalid reset link");
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_DIRECTORY_API}/directory/companies/verify-reset-token/${token}`
        );

        if (response.ok) {
          setTokenStatus("valid");
        } else {
          const errorData = await response.json();
          setTokenStatus("invalid");
          setErrorMessage(errorData.error || "Invalid or expired reset link");
        }
      } catch (error) {
        console.error("Token verification error:", error);
        setTokenStatus("invalid");
        setErrorMessage("An error occurred while verifying the reset link");
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match");
      setStatus("error");
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      setStatus("error");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API}/directory/companies/reset-password`,
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
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || "An error occurred");
        setStatus("error");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setErrorMessage("An error occurred. Please try again later.");
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
            Helping you adopt PACT standards with ease
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
            <p style={{ marginTop: "20px" }}>Verifying reset link...</p>
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
            Helping you adopt PACT standards with ease
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
              Invalid Reset Link
            </h2>
            <Callout.Root color="bronze" variant="surface">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                {errorMessage ||
                  "This reset link is invalid or has expired. Please request a new one."}
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
                Request New Reset Link
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
                Back to Login
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
            Helping you adopt PACT standards with ease
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
                  Password Reset Successful
                </h2>
                <Callout.Root color="green" variant="surface">
                  <Callout.Icon>
                    <CheckIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    Your password has been successfully reset. You will be
                    redirected to the login page shortly.
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
                    Go to Login
                  </Link>
                </Box>
              </Box>
            ) : (
              <>
                <h2 style={{ marginBottom: "20px" }}>Set New Password</h2>
                <p style={{ marginBottom: "30px", color: "#666" }}>
                  Enter your new password below.
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
                      New Password<span style={{ color: "red" }}>*</span>
                    </Form.Label>
                    <Form.Control asChild>
                      <TextField.Root
                        type="password"
                        name="password"
                        value={formData.password}
                        required
                        minLength={6}
                        placeholder="Enter new password"
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
                      Password is required.
                    </Form.Message>
                    <Form.Message
                      match="tooShort"
                      style={{
                        color: "var(--base-color-brand--light-blue)",
                        fontSize: "0.85em",
                      }}
                    >
                      Password must be at least 6 characters long.
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
                      Confirm New Password
                      <span style={{ color: "red" }}>*</span>
                    </Form.Label>
                    <Form.Control asChild>
                      <TextField.Root
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        required
                        placeholder="Confirm new password"
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
                      Please confirm your password.
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
                          ? "Resetting..."
                          : "Reset Password"}
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
                      {errorMessage || "An error occurred. Please try again."}
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
                  Need help? Contact us at:{" "}
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
