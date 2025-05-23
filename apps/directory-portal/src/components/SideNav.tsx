import React from "react";
import { Text } from "@radix-ui/themes";
import { NavLink } from "react-router-dom";
import { featureFlags } from "../utils/feature-flags";

const SideNav: React.FC = () => {
  return (
    <>
      <div className="nav-group">
        <div className="nav-title">Services</div>
        <nav>
          <NavLink to="/conformance-test-runs">
            <Text>Conformance Testing</Text>
          </NavLink>
          {featureFlags.enableIdentityManagement && (
            <>
              <a href="#">Identity Management</a>
              <NavLink
                to="/search"
                style={{ textDecoration: "none", paddingLeft: "2em" }}
              >
                <Text>Search</Text>
              </NavLink>
              <NavLink
                to="/manage-connections"
                style={{ textDecoration: "none", paddingLeft: "2em" }}
              >
                <Text>Manage Connections</Text>
              </NavLink>
            </>
          )}
        </nav>
      </div>
      {featureFlags.enableIdentityManagement && (
        <div className="nav-group">
          <div className="nav-title">Settings</div>
          <nav>
            <NavLink to="/my-profile">
              <Text>Profile</Text>
            </NavLink>
          </nav>
        </div>
      )}

      <div className="nav-group">
        <p style={{ fontSize: "0.8em" }}>
          <div className="nav-title">Support</div>
          Need help? Contact us at:
          <br />
          <a
            style={{ fontWeight: "bold" }}
            href="mailto:pact-support@wbcsd.org"
          >
            pact-support@wbcsd.org
          </a>
        </p>
      </div>
    </>
  );
};

export default SideNav;
