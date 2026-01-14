import React from "react";
import { IconButton, Text } from "@radix-ui/themes";
import { NavLink, useNavigate } from "react-router-dom";
import FeatureFlag from "./FeatureFlag";
import PolicyGuard from "./PolicyGuard";
import { PlusCircledIcon } from "@radix-ui/react-icons";

const SideNav: React.FC = () => {
  const navigate = useNavigate();
  return (
    <>
      <div className="nav-group">
        <div className="nav-title">Services</div>
        <nav>
          <NavLink to="/conformance-test-runs">
            <Text>Conformance Testing</Text>
          </NavLink>
          <FeatureFlag flag="enableIdentityManagement">
            <PolicyGuard policies={["view-connections-own-organization", "view-connections-all-organizations"]}>
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
            </PolicyGuard>
          </FeatureFlag>
        </nav>
      </div>
      <FeatureFlag flag="enableNodeManagement">
        <div className="nav-group">
          <div style={{
            display: "flex",
          }}>
            <div className="nav-title">Sandbox</div>
            <PolicyGuard policies={["edit-nodes-own-organization", "edit-nodes-all-organizations"]}>
              <IconButton
                onClick={() => navigate("/add-node")}
                style={{ padding: "1px 5px", margin: 0, cursor: "pointer" }}
                aria-label="Add Node"
                variant="ghost" 
                size="1"
              >
                <PlusCircledIcon />
              </IconButton>
            </PolicyGuard>
          </div>
          <nav>
            <PolicyGuard policies={["view-nodes-own-organization", "view-nodes-all-organizations"]}>
              <NavLink
                to="/nodes"
                style={{ textDecoration: "none" }}
              >
                <Text>Nodes</Text>
              </NavLink>
            </PolicyGuard>
          </nav>
        </div>
      </FeatureFlag>
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
