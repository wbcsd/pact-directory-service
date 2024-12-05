// src/pages/LoginPage.tsx
import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button, Flex, Text, TextField, Callout } from "@radix-ui/themes";
import { Link, useNavigate } from "react-router-dom";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
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
        `${import.meta.env.VITE_DIRECTORY_API_URL}/companies/login`,
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
          localStorage.setItem("jwt", token);
          navigate("/my-profile");
        } else {
          throw new Error("Token not found in response");
        }
      } else if (response.status === 401) {
        setErrorMessage("Invalid email or password");
      } else {
        throw new Error("Failed to login");
      }
    } catch (error) {
      console.error("Error during login:", error);
      setErrorMessage("An error occurred during login");
    }
  };

  return (
    <Box
      style={{
        padding: "20px",
        maxWidth: "550px",
        margin: "0 auto",
      }}
    >
      <h2>Login</h2>
      <Form.Root onSubmit={handleSubmit}>
        <Form.Field name="email">
          <Form.Control asChild>
            <TextField.Root
              type="email"
              value={formData.email}
              required
              placeholder="Email"
              onChange={handleChange}
            ></TextField.Root>
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
        </Form.Field>
        <Form.Field name="password">
          <Form.Control asChild>
            <TextField.Root
              type="password"
              value={formData.password}
              required
              placeholder="Password"
              onChange={handleChange}
            ></TextField.Root>
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
        </Form.Field>
        <Flex gap={"3"}>
          <Box>
            <Form.Submit asChild>
              <Button type="submit">Login</Button>
            </Form.Submit>
          </Box>
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "var(--base-color-brand--light-blue)",
                fontSize: "0.90em",
              }}
            >
              Don't have an account? <Link to={"/signup"}>Sign Up</Link>
            </Text>
          </Box>
        </Flex>
      </Form.Root>
      {errorMessage && (
        <Callout.Root color="bronze" highContrast variant="surface" mt={"4"}>
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{errorMessage}</Callout.Text>
        </Callout.Root>
      )}
    </Box>
  );
};

export default LoginPage;
