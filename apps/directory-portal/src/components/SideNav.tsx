import React from "react";
import { IconButton, Text, Tooltip } from "@radix-ui/themes";
import { NavLink } from "react-router-dom";
import FeatureFlag from "./FeatureFlag";
import PolicyGuard from "./PolicyGuard";
import { InfoCircledIcon } from "@radix-ui/react-icons";

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
          <FeatureFlag flag="enableNodeManagement">
            <PolicyGuard policies={["view-nodes-own-organization", "view-nodes-all-organizations"]}>
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
                  <NavLink
                    to="/nodes"
                    style={{ textDecoration: "none", flex: 1 }}
                  >
                    <Text>Nodes</Text>
                  </NavLink>
                  <Tooltip content="View individual node connections from the Nodes page">
                    <IconButton
                      variant="ghost"
                      size="1"
                      style={{ padding: "2px", cursor: "help" }}
                    >
                      <InfoCircledIcon />
                    </IconButton>
                  </Tooltip>
                </div>
              </>
            </PolicyGuard>
          </FeatureFlag>          
          <NavLink to="/activity-logs">
            <Text>Activity Logs</Text>
          </NavLink>
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
