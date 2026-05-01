import React from "react";
import { Text } from "@radix-ui/themes";
import { NavLink } from "react-router-dom";
import FeatureFlag from "./FeatureFlag";
import PolicyGuard from "./PolicyGuard";

const SideNav: React.FC = () => {
  return (
    <>
      <div className="nav-group">
        <div className="nav-title">Services</div>
        <nav>
          <NavLink to="/conformance-test-runs">
            <Text>Conformance Testing</Text>
          </NavLink>
        </nav>
      </div>
      <div className="nav-group">
        <div className="nav-title">Exchange</div>
        <nav>
          <FeatureFlag flag="enableNodeManagement">
            <PolicyGuard policies={["view-nodes-own-organization", "view-nodes-all-organizations"]}>
              <NavLink
                to="/nodes"
                style={{ textDecoration: "none", flex: 1 }}
              >
                <Text>Nodes</Text>
              </NavLink>
            </PolicyGuard>
          </FeatureFlag>          
          <NavLink to="/activity-logs">
            <Text>Activity Logs</Text>
          </NavLink>
        </nav>
      </div>
      <div className="nav-group">
        <div className="nav-title">Settings</div>
        <nav>
          <NavLink to="/my-profile">
            <Text>Profile</Text>
          </NavLink>
          <FeatureFlag flag="enableOrganizationManagement">
            <>
            <PolicyGuard policies={["view-all-organizations"]}>
                <NavLink
                  to="/organizations"
                  style={{ textDecoration: "none" }}
                >
                  <Text>Organizations</Text>
                </NavLink>
            </PolicyGuard>
            <PolicyGuard policies={["view-users", "view-all-users"]}>
              <NavLink
                to="/organization/users"
                style={{ textDecoration: "none" }}
              >
                <Text>Users</Text>
              </NavLink>
            </PolicyGuard>
            </>
          </FeatureFlag>
        </nav>
      </div>
      <div className="nav-group">
        <div style={{ fontSize: "0.8em" }}>
          <div className="nav-title">Support</div>
          Need help? Contact us at:
          <br />
          <a
            style={{ fontWeight: "bold" }}
            href="mailto:pact-support@wbcsd.org"
          >
            pact-support@wbcsd.org
          </a>
        </div>
      </div>
    </>
  );
};

export default SideNav;
