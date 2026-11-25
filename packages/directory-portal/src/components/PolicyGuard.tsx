import { useAuth } from "../contexts/AuthContext";
import { ReactElement } from "react";

const PolicyGuard: React.FC<{
  policies?: string[];
  predicate?: "and" | "or";
  children: ReactElement;
}> = ({ policies, predicate, children }) => {
  const { profileData } = useAuth();

  // If no policies are specified, render normally
  if (!policies || policies.length === 0) {
    return children;
  }

  // Check if user has all required policies taking predicate into account
  const hasRequiredPolicies = policies[predicate === "and" ? "every" : "some"](policy =>
    profileData?.policies?.includes(policy) || false
  );

  // If user doesn't have required policies, return null
  if (!hasRequiredPolicies) {
    return null;
  }

  return children;
};

export default PolicyGuard;
