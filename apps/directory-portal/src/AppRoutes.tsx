import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import MyProfile from "./pages/MyProfile";
import SearchPage from "./pages/SearchPage";
import OrganizationProfile from "./pages/OrganizationProfile";
import ManageConnections from "./pages/ManageConnections";
import ConformanceTesting from "./pages/ConformanceTesting";
import ConformanceTestResult from "./pages/ConformanceTestResult";
import ConformanceTestRuns from "./pages/ConformanceTestRuns";
import { featureFlags } from "./utils/feature-flags";
import OrganizationUsers from "./pages/OrganizationUsers";
import EditUserPage from "./pages/EditUserPage";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/my-profile" element={<MyProfile />} />
      {featureFlags.enableIdentityManagement === true && (
        <>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/organization/:id" element={<OrganizationProfile />} />
          <Route path="/manage-connections" element={<ManageConnections />} />
        </>
      )}
      {featureFlags.enableOrganizationManagement === true && (
        <>
          <Route path="/organization/users" element={<OrganizationUsers />} />
          <Route path="/organization/users/:id" element={<EditUserPage />} />
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
