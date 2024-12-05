import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import MyProfile from "./pages/MyProfile";
import SearchPage from "./pages/SearchPage";
import CompanyProfile from "./pages/CompanyProfile";
import ManageConnections from "./pages/ManageConnections";
import pactLogo from "./assets/pact-logo.svg";
import { Box } from "@radix-ui/themes";

const App: React.FC = () => {
  return (
    <Router>
      <Box
        style={{
          paddingLeft: "35px",
          height: "88px",
          flexDirection: "column",
          justifyContent: "center",
          display: "flex",
          borderBottom: "1px solid #d9d9d9",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <img width={96} src={pactLogo} alt="Pact Logo" />
      </Box>
      <div style={{ padding: "20px" }}>
        <nav>
          <Link to="/login" style={{ marginRight: "10px" }}>
            Login
          </Link>
          <Link to="/signup" style={{ marginRight: "10px" }}>
            Sign Up
          </Link>
          <Link to="/my-profile" style={{ marginRight: "10px" }}>
            My Profile
          </Link>
          <Link to="/search" style={{ marginRight: "10px" }}>
            Search
          </Link>
          <Link to="/manage-connections">Manage Connections</Link>
        </nav>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/company/:id" element={<CompanyProfile />} />
          <Route path="/manage-connections" element={<ManageConnections />} />
          <Route path="/" element={<Navigate to="/signup" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
