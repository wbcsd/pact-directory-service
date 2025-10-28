import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button, TextField, Callout } from "@radix-ui/themes";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExclamationTriangleIcon, CheckIcon } from "@radix-ui/react-icons";
import HeroImage from "../assets/providers-header.webp";
import useBodyOverflow from "../utils/use-body-overflow";
import "./SetPasswordPage.css";

const SetPasswordPage: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const token = params.token;

  useBodyOverflow(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      setStatus("error");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      setStatus("error");
      return;
    }

    if (!token) {
      setErrorMessage("Invalid or missing reset token");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API}/directory/users/set-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            token,
            password,
            confirmPassword,
          }),
        }
      );

      if (response.ok) {
        setStatus("success");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        const error = await response.json();
        setErrorMessage(error.message || "An error occurred");
        setStatus("error");
      }
    } catch (error) {
      console.error("Set password error:", error);
      setErrorMessage("An error occurred. Please try again later.");
      setStatus("error");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (status === "error") {
      setStatus("idle");
      setErrorMessage("");
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (status === "error") {
      setStatus("idle");
      setErrorMessage("");
    }
  };

  return (
    <>
      <Box className="container">
        <Box
          className="hero-section"
          style={{
            backgroundImage: `url(${HeroImage})`,
          }}
        >
          <h2 className="hero-title">
            Helping you adopt PACT standards with ease
          </h2>
        </Box>
        <Box className="main-content">
          <Box className="content-wrapper">
            {status === "success" ? (
              <Box>
                <h2 className="success-title">
                  Password Reset Successful
                </h2>
                <Callout.Root color="green" variant="surface">
                  <Callout.Icon>
                    <CheckIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    Your password has been successfully reset. You will be
                    redirected to the login page in a few seconds.
                  </Callout.Text>
                </Callout.Root>
                <Box className="success-link-container">
                  <Link
                    to="/login"
                    className="success-link"
                  >
                    Go to Login
                  </Link>
                </Box>
              </Box>
            ) : (
              <>
                <h2 className="form-title">Set New Password</h2>
                <p className="form-description">
                  Please enter your new password below. Make sure it's at least
                  6 characters long.
                </p>

                <Form.Root onSubmit={handleSubmit}>
                  <Form.Field name="password">
                    <Form.Label className="form-label">
                      New Password<span className="required-asterisk">*</span>
                    </Form.Label>
                    <Form.Control asChild>
                      <TextField.Root
                        type="password"
                        value={password}
                        required
                        placeholder="Enter your new password"
                        onChange={handlePasswordChange}
                        disabled={status === "loading"}
                        className="text-field"
                      />
                    </Form.Control>
                    <Form.Message
                      match="valueMissing"
                      className="form-message"
                    >
                      Password is required.
                    </Form.Message>
                  </Form.Field>

                  <Form.Field name="confirmPassword" className="confirm-password-field">
                    <Form.Label className="form-label">
                      Confirm Password<span className="required-asterisk">*</span>
                    </Form.Label>
                    <Form.Control asChild>
                      <TextField.Root
                        type="password"
                        value={confirmPassword}
                        required
                        placeholder="Confirm your new password"
                        onChange={handleConfirmPasswordChange}
                        disabled={status === "loading"}
                        className="text-field"
                      />
                    </Form.Control>
                    <Form.Message
                      match="valueMissing"
                      className="form-message"
                    >
                      Please confirm your password.
                    </Form.Message>
                  </Form.Field>

                  <Box className="submit-button-container">
                    <Form.Submit asChild>
                      <Button
                        className="submit-button"
                        type="submit"
                        disabled={status === "loading"}
                      >
                        {status === "loading"
                          ? "Setting Password..."
                          : "Set Password"}
                      </Button>
                    </Form.Submit>
                  </Box>
                </Form.Root>

                <Box className="back-link-container">
                  <Link
                    to="/login"
                    className="back-link"
                  >
                    Back to Login
                  </Link>
                </Box>

                {status === "error" && (
                  <Callout.Root
                    color="bronze"
                    highContrast
                    variant="surface"
                    className="error-callout"
                  >
                    <Callout.Icon>
                      <ExclamationTriangleIcon />
                    </Callout.Icon>
                    <Callout.Text>
                      {errorMessage || "An error occurred. Please try again."}
                    </Callout.Text>
                  </Callout.Root>
                )}

                <p className="help-text">
                  Need help? Contact us at:{" "}
                  <a
                    className="help-link"
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

export default SetPasswordPage;