import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  // TextField,
  Text,
  Spinner,
} from "@radix-ui/themes";
import SideNav from "../components/SideNav";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useNavigate, useParams } from "react-router-dom";


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
    // Implement delete node functionality
    try {
      const response = await fetchWithAuth(`/nodes/${nodeId}`, {
        method: "DELETE",
      });

      if (response!.ok) {
        // Node deleted successfully
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

  if (loading) {
    return (
      <>
        <aside className="sidebar">
          <div className="marker-divider"></div>
          <SideNav />
        </aside>
        <main className="main">
          <div className="header">
            <h2>Node</h2>
          </div>
          <Box
            style={{
              marginTop: "2em",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Spinner />
          </Box>
        </main>
      </>
    );
  }

  if (errorMessage) {
    return (
      <>
        <aside className="sidebar">
          <div className="marker-divider"></div>
          <SideNav />
        </aside>
        <main className="main">
          <div className="header">
            <h2>Node</h2>
          </div>
          <Box
            style={{
              marginTop: "2em",
            }}
          >
            <div style={{ color: "darkred" }}>
              <Text>{errorMessage}</Text>
            </div>
          </Box>
        </main>
      </>
    );
  }

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <h2>Node {nodeData?.name}</h2>
        </div>
        <Button onClick={() => navigate(`/edit-node/${nodeId}`)}>Edit Node</Button>
        <span>&nbsp;</span>
        <Button onClick={() => deleteNode()}>Delete Node</Button>

      </main>
    </>
  );
};

export default NodeDashboardPage;