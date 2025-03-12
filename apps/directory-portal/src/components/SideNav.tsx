// src/components/SideNav.tsx
import React from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { NavLink } from "react-router-dom";

const SideNav: React.FC = () => {
  return (
    <Box
      style={{
        width: "250px",
        padding: "20px",
      }}
    >
      <Flex direction="column" gap="2" className="side-nav">
        <NavLink to="/my-profile" style={{ textDecoration: "none" }}>
          <Text size="4">My Profile</Text>
        </NavLink>
        <NavLink to="/search" style={{ textDecoration: "none" }}>
          <Text size="4">Search</Text>
        </NavLink>
        <NavLink to="/manage-connections" style={{ textDecoration: "none" }}>
          <Text size="4">Manage Connections</Text>
        </NavLink>
        <NavLink to="/conformance-testing" style={{ textDecoration: "none" }}>
          <Text size="4">Conformance Testing</Text>
        </NavLink>
      </Flex>
    </Box>
  );
};

export default SideNav;
