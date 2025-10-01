import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
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
import pactLogo from "./assets/pact-logo.svg";
import { ConformanceTestingProvider } from "./components/ConformanceTesting";
import SignUp from "./components/SignUp";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./AppRoutes";

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ConformanceTestingProvider>
          <div className="top-bar">
            <div className="logo">
              <img width={153} src={pactLogo} alt="Pact Logo" />
            </div>
            <div className="search-bar">
              <SignUp />
            </div>
          </div>
          <div className="container">
            <AppRoutes />
          </div>
        </ConformanceTestingProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
