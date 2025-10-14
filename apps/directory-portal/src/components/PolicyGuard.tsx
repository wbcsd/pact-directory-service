import { useAuth } from "../contexts/AuthContext";
import { ReactElement } from "react";

const PolicyGuard: React.FC<{
  policies?: string[];
  children: ReactElement;
}> = ({ policies, children }) => {
  const { profileData } = useAuth();

  // If no policies are specified, render normally
  if (!policies || policies.length === 0) {
    return children;
  }

  // Check if user has all required policies
  const hasRequiredPolicies = policies.every((policy) =>
    profileData?.policies?.includes(policy)
  );

  // If user doesn't have required policies, return null
  if (!hasRequiredPolicies) {
    return null;
  }

  return children;
};

export default PolicyGuard;
