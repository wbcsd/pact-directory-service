import React from "react";
import { NavLink } from "react-router-dom";
import { Text } from "@radix-ui/themes";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useAuth } from "../contexts/AuthContext";

export const SideNavNodesList: React.FC = () => {
  const [nodes, setNodes] = React.useState([]);
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const { profileData } = useAuth();

  React.useEffect(() => {
    // Fetch nodes from API or context
    const fetchNodes = async () => {
      if (!profileData) return;

      try {
        setLoading(true);
        const response = await fetchWithAuth(`/organizations/${profileData!.organizationId}/nodes`);
        const { data } = await response!.json();
        setNodes(data);
      } catch (error) {
        setError(error as Error);
        console.error("Error fetching nodes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNodes();
  }, [profileData]);

  if (loading) {
    return <nav><Text size="2" style={{ paddingLeft: '1em' }}>Loading nodes...</Text></nav>;
  }

  if (error) {
    return <nav><Text size="2" style={{ paddingLeft: '1em', color: 'darkred' }}>Couldn't load nodes</Text></nav>;
  }

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