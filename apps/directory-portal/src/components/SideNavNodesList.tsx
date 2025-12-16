import React from "react";
import { NavLink } from "react-router-dom";
import { Text } from "@radix-ui/themes";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useAuth } from "../contexts/AuthContext";

export const SideNavNodesList: React.FC = () => {
  const [nodes, setNodes] = React.useState([]);
  const { profileData } = useAuth();

  React.useEffect(() => {
    if (!profileData) return;
    // Fetch nodes from API or context
    const fetchNodes = async () => {
      const response = await fetchWithAuth(`/organizations/${profileData.organizationId}/nodes`);
      const { data } = await response!.json();
      setNodes(data);
    };
    fetchNodes();
  }, [profileData]);

  return (
    <nav>
      {nodes.map((node: Record<string, string>) => (
        <NavLink key={node.id} to={`/nodes/${node.id}`}>
          <Text>{node.name}</Text>
        </NavLink>
      ))}
    </nav>
  );
}