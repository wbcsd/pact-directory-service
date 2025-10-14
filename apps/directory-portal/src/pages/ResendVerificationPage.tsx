import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button, TextField, Callout } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import { ExclamationTriangleIcon, CheckIcon } from "@radix-ui/react-icons";
import HeroImage from "../assets/providers-header.webp";

const ResendVerificationPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API}/directory/users/resend-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
      } else {
        setErrorMessage(data.message || "An error occurred");
        setStatus("error");
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      setErrorMessage("An error occurred. Please try again later.");
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
                  Verification Email Sent
                </h2>
                <Callout.Root color="green" variant="surface">
                  <Callout.Icon>
                    <CheckIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    If an account with that email exists and is unverified, we've sent you a new verification email. 
                    Please check your email and click the link to verify your account.
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
                    Back to Login
                  </Link>
                </Box>
              </Box>
            ) : (
              <>
                <h2 style={{ marginBottom: "20px" }}>Resend Verification Email</h2>
                <p style={{ marginBottom: "30px", color: "#666" }}>
                  Enter your email address and we'll send you a new verification link.
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
                      Email Address<span style={{ color: "red" }}>*</span>
                    </Form.Label>
                    <Form.Control asChild>
                      <TextField.Root
                        type="email"
                        value={email}
                        required
                        placeholder="Enter your email address"
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
                      Email is required.
                    </Form.Message>
                    <Form.Message
                      match="typeMismatch"
                      style={{
                        color: "var(--base-color-brand--light-blue)",
                        fontSize: "0.85em",
                      }}
                    >
                      Please enter a valid email address.
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
                          ? "Sending..."
                          : "Send Verification Email"}
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
                    Back to Login
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

export default ResendVerificationPage;