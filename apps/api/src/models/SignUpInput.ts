import { z } from "zod";

export const SignUpInputSchema = z
  .object({
    companyName: z.string(),
    companyIdentifier: z.string(),
    fullName: z.string(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string(),
    solutionApiUrl: z.string(),
    registrationCode: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof SignUpInputSchema>;
