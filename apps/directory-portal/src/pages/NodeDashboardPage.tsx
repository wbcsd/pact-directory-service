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
import { useParams } from "react-router-dom";


const NodeDashboardPage: React.FC = () => {
  const { id: nodeId } = useParams<{ id: string }>();
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
        <Button>Edit Node</Button>
        <span>&nbsp;</span>
        <Button>Delete Node</Button>

      </main>
    </>
  );
};

export default NodeDashboardPage;