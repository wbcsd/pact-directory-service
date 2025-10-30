import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Box, Callout } from "@radix-ui/themes";
import { CheckIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { LandingPageLayout } from "../layouts";

const EmailVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");
  const alreadyVerified = useRef(false);

  useEffect(() => {
    // Prevent duplicate calls (handles React Strict Mode)
    if (alreadyVerified.current) {
      return; 
    }
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    alreadyVerified.current = true;

    const verifyEmail = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_DIRECTORY_API}/directory/users/verify-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully. Your account is now active.");
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed. The token may be invalid or expired.");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("An error occurred during verification. Please try again later.");
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <LandingPageLayout>

            {status === "verifying" && (
              <Box style={{ textAlign: "center" }}>
                <h2 style={{ marginBottom: "20px" }}>Verifying Email...</h2>
                <p style={{ color: "#666" }}>Please wait while we verify your email address.</p>
              </Box>
            )}

            {status === "success" && (
              <Box>
                <h2 style={{ marginBottom: "20px", color: "#0A0552" }}>
                  Email Verified Successfully!
                </h2>
                <Callout.Root color="green" variant="surface" style={{ marginBottom: "30px" }}>
                  <Callout.Icon>
                    <CheckIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    {message}
                  </Callout.Text>
                </Callout.Root>
                <p style={{ marginBottom: "30px", color: "#666" }}>
                  Your account is now active and you can start using PACT Network Services.
                </p>
                <Box style={{ textAlign: "center" }}>
                  <Link
                    to="/login"
                    style={{
                      display: "inline-block",
                      backgroundColor: "#0A0552",
                      color: "white",
                      padding: "12px 24px",
                      textDecoration: "none",
                      borderRadius: "4px",
                      fontSize: "1em",
                    }}
                  >
                    Continue to Login
                  </Link>
                </Box>
              </Box>
            )}

            {status === "error" && (
              <Box>
                <h2 style={{ marginBottom: "20px", color: "#0A0552" }}>
                  Verification Failed
                </h2>
                <Callout.Root color="bronze" highContrast variant="surface" style={{ marginBottom: "30px" }}>
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    {message}
                  </Callout.Text>
                </Callout.Root>
                <p style={{ marginBottom: "30px", color: "#666" }}>
                  You can request a new verification email or contact support if the problem persists.
                </p>
                <Box style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "15px" }}>
                  <Link
                    to="/resend-verification"
                    style={{
                      color: "#0A0552",
                      textDecoration: "underline",
                      fontSize: "0.9em",
                    }}
                  >
                    Request New Verification Email
                  </Link>
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
            )}
            <p style={{ fontSize: "0.9em", marginTop: "40px", textAlign: "center" }}>
              Need help? Contact us at:{" "}
              <a
                style={{ fontWeight: "bold" }}
                href="mailto:pact-support@wbcsd.org"
              >
                pact-support@wbcsd.org
              </a>
            </p>

    </LandingPageLayout>
  );
};

export default EmailVerificationPage;