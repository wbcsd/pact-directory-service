import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button, Callout, Flex, Heading, Link, Text } from "@radix-ui/themes";
import { Link as RouterLink } from "react-router-dom";
import { ExclamationTriangleIcon, CheckIcon } from "@radix-ui/react-icons";
import { LandingPageLayout } from "../layouts";
import { FormField, TextField } from "../components/ui";

const ForgotPasswordPage: React.FC = () => {
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
        `${import.meta.env.VITE_DIRECTORY_API}/directory/users/forgot-password`,
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
        const error = await response.json();
        setErrorMessage(error.message || "An error occurred");
        setStatus("error");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setErrorMessage("An error occurred. Please try again later.");
      setStatus("error");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  return (
    <LandingPageLayout>

            {status === "success" ? (
              <Box>
                <Heading mb="4">
                  Check Your Email
                </Heading>
                <Callout.Root color="green" variant="surface">
                  <Callout.Icon>
                    <CheckIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    If an account with that email exists, we've sent you a
                    password reset link. Please check your email and click the
                    link to reset your password.
                  </Callout.Text>
                </Callout.Root>
                <Flex justify="center" mt="5">
                  <Link asChild size="2">
                    <RouterLink to="/login">Back to Login</RouterLink>
                  </Link>
                </Flex>
              </Box>
            ) : (
              <>
                <Heading mb="4">Reset Your Password</Heading>
                <Text as="p" color="gray" mb="5">
                  Enter your email address and we'll send you a link to reset
                  your password.
                </Text>

                <Form.Root onSubmit={handleSubmit}>
                  <FormField
                    name="email"
                    label="Email Address"
                    required
                  >
                    <TextField
                      type="email"
                      value={email}
                      required
                      placeholder="Enter your email address"
                      onChange={handleChange}
                      disabled={status === "loading"}
                    />
                    <Form.Message match="typeMismatch">
                      Please enter a valid email address.
                    </Form.Message>
                  </FormField>

                  <Box mt="5">
                    <Form.Submit asChild>
                      <Button
                        style={{ width: "100%" }}
                        type="submit"
                        disabled={status === "loading"}
                      >
                        {status === "loading"
                          ? "Sending..."
                          : "Send Reset Link"}
                      </Button>
                    </Form.Submit>
                  </Box>
                </Form.Root>

                <Flex justify="center" mt="4">
                  <Link asChild size="2">
                    <RouterLink to="/login">Back to Login</RouterLink>
                  </Link>
                </Flex>

                {status === "error" && (
                  <Callout.Root
                    color="bronze"
                    highContrast
                    variant="surface"
                    mt="4"
                  >
                    <Callout.Icon>
                      <ExclamationTriangleIcon />
                    </Callout.Icon>
                    <Callout.Text>
                      {errorMessage || "An error occurred. Please try again."}
                    </Callout.Text>
                  </Callout.Root>
                )}

                <Text
                  as="p"
                  size="2"
                  mt="5"
                  align="center"
                >
                  Need help? Contact us at:{" "}
                  <Link href="mailto:pact-support@wbcsd.org" weight="bold">
                    pact-support@wbcsd.org
                  </Link>
                </Text>
              </>
            )}

    </LandingPageLayout>
  );
};

export default ForgotPasswordPage;
