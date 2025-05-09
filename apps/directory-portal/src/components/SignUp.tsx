import React from "react";
import { useLocation, Link } from "react-router-dom";

const SignUp: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  if (currentPath === "/login") {
    return (
      <div className="auth-link">
        <span>
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </span>
      </div>
    );
  } else if (currentPath === "/signup") {
    return (
      <div className="auth-link">
        <span>
          Already a member? <Link to="/login">Login</Link>
        </span>
      </div>
    );
  } else {
    return (
      <div className="auth-link">
        <Link to="/login">Logout</Link>
      </div>
    );
  }
};

export default SignUp;
