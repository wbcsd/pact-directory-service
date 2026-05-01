import type { ProfileData } from "../../../src/contexts/AuthContext";

export const mockProfileData: ProfileData = {
  id: 1,
  organizationId: 10,
  organizationName: "Test Organisation",
  organizationIdentifier: "TEST-ORG-001",
  organizationDescription: "A test organisation for e2e testing",
  solutionApiUrl: null,
  fullName: "Test User",
  email: "test@example.com",
  role: "administrator",
  status: "enabled",
  policies: [
    "view-all-organizations",
    "view-nodes-own-organization",
    "manage-nodes-own-organization",
    "view-users-own-organization",
    "manage-users-own-organization",
  ],
};

export const mockLoginResponse = {
  token: "e2e-test-token",
};

export const mockForgotPasswordResponse = {
  message: "If an account exists for that email, a reset link has been sent.",
};

export const mockResetPasswordResponse = {
  message: "Password has been reset successfully.",
};

export const mockVerifyEmailResponse = {
  message: "Email verified successfully.",
};

export const mockSetPasswordResponse = {
  message: "Password set successfully.",
};
