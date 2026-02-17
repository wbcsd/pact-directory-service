import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Text,
} from "@radix-ui/themes";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useNavigate, useParams } from "react-router-dom";
import { GridPageLayout } from "../layouts";


const NodeDashboardPage: React.FC = () => {
  const { id: nodeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [nodeData, setNodeData] = useState<Record<string, string> | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNodeData = async () => {
      try {
        setErrorMessage("");
        setLoading(true);
        const data = await fetchWithAuth(`/nodes/${nodeId}`);
        setNodeData(await data!.json());
      } catch (error) {
        setErrorMessage("Failed to fetch node data");
        console.error("Error fetching node data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNodeData();
  }, [nodeId]);

  const deleteNode = async () => {
    try {
      const response = await fetchWithAuth(`/nodes/${nodeId}`, {
        method: "DELETE",
      });

      if (response!.ok) {
        window.location.reload();
      } else {
        const errorResponse = await response!.json();
        if (errorResponse.message) {
          setErrorMessage(errorResponse.message);
        } else {
          setErrorMessage("Failed to delete node");
        }
      }
    } catch (error) {
      setErrorMessage("An error occurred while deleting the node");
      console.error("Error deleting node:", error);
    }
  };

  return (
    <GridPageLayout
      title={loading ? "Node" : `Node ${nodeData?.name ?? ""}`}
      loading={loading}
      loadingMessage="Loading node..."
    >
      {errorMessage ? (
        <Box style={{ marginTop: "2em" }}>
          <div style={{ color: "darkred" }}>
            <Text>{errorMessage}</Text>
          </div>
        </Box>
      ) : (
        <Box style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <Button onClick={() => navigate(`/nodes/${nodeId}/connections`)}>
            View Connections
          </Button>
          <Button onClick={() => navigate(`/nodes/${nodeId}/invitations`)}>
            View Invitations
          </Button>
          <Button onClick={() => navigate(`/edit-node/${nodeId}`)}>
            Edit Node
          </Button>
          <Button color="red" variant="soft" onClick={() => deleteNode()}>
            Delete Node
          </Button>
        </Box>
      )}
    </GridPageLayout>
  );
};

export default NodeDashboardPage;