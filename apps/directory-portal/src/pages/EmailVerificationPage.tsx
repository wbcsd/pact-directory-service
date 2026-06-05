import React, { useState, useEffect, useRef } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { Box, Button, Callout, Flex, Heading, Link, Text } from "@radix-ui/themes";
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
          setMessage(data.message || "Your account is now active.");
        } else {
          setStatus("error");
          setMessage(data.message || "The token may be invalid or expired.");
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
              <Flex direction="column" align="center">
                <Heading mb="4">Verifying Email...</Heading>
                <Text color="gray">Please wait while we verify your email address.</Text>
              </Flex>
            )}

            {status === "success" && (
              <Box>
                <Heading mb="4">
                  Email Verified Successfully!
                </Heading>
                <Callout.Root color="green" variant="surface" mb="5">
                  <Callout.Icon>
                    <CheckIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    {message}
                  </Callout.Text>
                </Callout.Root>
                <Flex justify="center">
                  <Button asChild>
                    <RouterLink to="/login">Continue to Login</RouterLink>
                  </Button>
                </Flex>
              </Box>
            )}

            {status === "error" && (
              <Box>
                <Heading mb="4">
                  Verification Failed
                </Heading>
                <Callout.Root color="bronze" highContrast variant="surface" mb="5">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    {message}
                  </Callout.Text>
                </Callout.Root>
                <Text as="p" color="gray" mb="5">
                  You can request a new verification email or contact support if the problem persists.
                </Text>
                <Flex direction="column" align="center" gap="4">
                  <Link asChild size="2">
                    <RouterLink to="/resend-verification">
                      Request New Verification Email
                    </RouterLink>
                  </Link>
                  <Link asChild size="2">
                    <RouterLink to="/login">Back to Login</RouterLink>
                  </Link>
                </Flex>
              </Box>
            )}
            <Text as="p" size="2" mt="6" align="center">
              Need help? Contact us at:{" "}
              <Link href="mailto:pact-support@wbcsd.org" weight="bold">
                pact-support@wbcsd.org
              </Link>
            </Text>

    </LandingPageLayout>
  );
};

export default EmailVerificationPage;