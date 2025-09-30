// create a react component that checks against a feature flag and conditionally renders children
import React from "react";
import { featureFlags } from "../utils/feature-flags";

interface FeatureFlagProps {
  flag: keyof typeof featureFlags;
  children: React.ReactNode;
}

const FeatureFlag: React.FC<FeatureFlagProps> = ({ flag, children }) => {
  if (featureFlags[flag]) {
    return <>{children}</>;
  }
  return null;
};

export default FeatureFlag;
