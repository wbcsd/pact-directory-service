import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AppRoutes from "./AppRoutes";
import LoadingSpinner from "./components/LoadingSpinner";

const AppContent: React.FC = () => {
  const { isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  return <AppRoutes />;
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
