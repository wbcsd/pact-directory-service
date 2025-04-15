import React from "react";
import { Text } from "@radix-ui/themes";
import { NavLink } from "react-router-dom";

const SideNav: React.FC = () => {
  return (
    <>
      <div className="nav-group">
        <div className="nav-title">Services</div>
        <nav>
          <NavLink to="/conformance-test-runs">
            <Text>Conformance Testing</Text>
          </NavLink>
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
        </nav>
      </div>
      <div className="nav-group">
        <div className="nav-title">Settings</div>
        <nav>
          <NavLink to="/my-profile">
            <Text>Profile</Text>
          </NavLink>
        </nav>
      </div>
    </>
  );
};

export default SideNav;
