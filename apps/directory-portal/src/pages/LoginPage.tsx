// src/pages/LoginPage.tsx
import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Box, Button } from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";

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
        maxWidth: "400px",
        margin: "0 auto",
      }}
    >
      <h2>Login</h2>
      <Form.Root onSubmit={handleSubmit}>
        <Form.Field name="email">
          <Form.Label>Email</Form.Label>
          <Form.Control asChild>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
        </Form.Field>
        <Form.Field name="password">
          <Form.Label>Password</Form.Label>
          <Form.Control asChild>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </Form.Control>
        </Form.Field>
        <Form.Submit asChild>
          <Button type="submit" style={{ marginTop: "10px" }}>
            Login
          </Button>
        </Form.Submit>
      </Form.Root>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
    </Box>
  );
};

export default LoginPage;
