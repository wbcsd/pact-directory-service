import React from "react";
import { Text } from "@radix-ui/themes";
import { NavLink } from "react-router-dom";

const SideNav: React.FC = () => {
  return (
    <>
      <div className="nav-group">
        <div className="nav-title">Services</div>
        <nav>
          <a className="active" href="#">
            Conformance Testing
          </a>
          <a href="#">Identity Management</a>
          <a href="#">...</a>
          <NavLink to="/my-profile">
            <Text>My Profile</Text>
          </NavLink>
          <NavLink to="/search" style={{ textDecoration: "none" }}>
            <Text>Search</Text>
          </NavLink>
          <NavLink to="/manage-connections" style={{ textDecoration: "none" }}>
            <Text>Manage Connections</Text>
          </NavLink>
          <NavLink to="/conformance-testing" style={{ textDecoration: "none" }}>
            <Text>Conformance Testing</Text>
          </NavLink>
        </nav>
      </div>
      <div className="nav-group">
        <div className="nav-title">Settings</div>
        <nav>
          <a href="#">Profile</a>
        </nav>
      </div>
    </>
  );
};

export default SideNav;
