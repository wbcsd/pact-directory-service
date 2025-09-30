import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
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
