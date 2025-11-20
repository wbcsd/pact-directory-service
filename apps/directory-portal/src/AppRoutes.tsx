import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import ResendVerificationPage from "./pages/ResendVerificationPage";
import MyProfilePage from "./pages/MyProfilePage";
import SearchPage from "./pages/SearchPage";
import OrganizationProfile from "./pages/OrganizationProfile";
import ManageConnections from "./pages/ManageConnections";
import ConformanceTesting from "./pages/ConformanceTesting";
import ConformanceTestResult from "./pages/ConformanceTestResult";
import ConformanceTestRuns from "./pages/ConformanceTestRuns";
import { featureFlags } from "./utils/feature-flags";
import OrganizationUsers from "./pages/OrganizationUsers";
import EditUserPage from "./pages/EditUserPage";
import AddUserPage from "./pages/AddUserPage";
import PolicyGuard from "./components/PolicyGuard";
import SetPasswordPage from "./pages/SetPasswordPage";
import OrganizationsList from "./pages/OrganizationsList";
import EditOrganizationPage from "./pages/EditOrganizationPage";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/set-password/:token" element={<SetPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/verify-email/:token" element={<EmailVerificationPage />} />
      <Route path="/resend-verification" element={<ResendVerificationPage />} />
      <Route path="/my-profile" element={<MyProfilePage />} />
      {featureFlags.enableIdentityManagement === true && (
        <>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/organization/:id" element={<OrganizationProfile />} />
          <Route path="/manage-connections" element={<ManageConnections />} />
        </>
      )}
      {featureFlags.enableOrganizationManagement === true && (
        <>
          <Route path="/organizations" element={<OrganizationsList />} />
          <Route path="/organizations/:id" element={<EditOrganizationPage />} />
          <Route path="/organization/users" element={<OrganizationUsers />} />
          <Route path="/organization/:orgId/:orgName/add-user" element={<AddUserPage />} />
          <Route path="/organization/:orgId/users/:userId" element={<EditUserPage />} />
          <Route
            path="/organization/users"
            element={
              <PolicyGuard policies={["view-own-organizations", "view-all-organizations"]}>
                <OrganizationUsers />
              </PolicyGuard>
            }
          />
          <Route
            path="/organization/:orgId/users/:userId"
            element={
              <PolicyGuard policies={["edit-own-organizations", "edit-all-organizations"]}>
                <EditUserPage />
              </PolicyGuard>
            }
          />
        </>
      )}
      <Route path="/conformance-testing" element={<ConformanceTesting />} />
      <Route
        path="/conformance-test-result"
        element={<ConformanceTestResult />}
      />
      <Route path="/conformance-test-runs" element={<ConformanceTestRuns />} />
      <Route path="/" element={<Navigate to="/signup" />} />
    </Routes>
  );
};
export default AppRoutes;
