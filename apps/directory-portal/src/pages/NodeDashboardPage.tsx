import React, { useEffect, useState } from "react";
import { Box, Button, Text, Spinner } from "@radix-ui/themes";
import {
  PlusIcon,
  FileTextIcon,
  UploadIcon,
  BarChartIcon,
  ReaderIcon,
  Pencil1Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import SideNav from "../components/SideNav";
import StatCard from "../components/StatCard";
import PCFList, { PCFItem } from "../components/PCFList";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useParams, useNavigate } from "react-router-dom";

// Mock data for the dashboard
const mockStats = {
  totalProducts: {
    value: "1,247",
    subtitle: "Active in catalog",
  },
  pcfRecords: {
    value: "892",
    subtitle: "Carbon footprints tracked",
  },
};

const mockIncomingPCFs: PCFItem[] = [
  {
    id: "1",
    name: "Recycled Aluminum Frames",
    pcfId: "INC-PCF-001",
    source: "EcoMetal Suppliers",
    value: "15.3 kg",
    unit: "CO₂eq",
    timestamp: "1 hour ago",
    status: "pending",
  },
  {
    id: "2",
    name: "Organic Fabric Rolls",
    pcfId: "INC-PCF-002",
    source: "GreenTextile Co",
    value: "3.8 kg",
    unit: "CO₂eq",
    timestamp: "4 hours ago",
  },
  {
    id: "3",
    name: "Bamboo Packaging Materials",
    pcfId: "INC-PCF-003",
    source: "Sustainable Pack Ltd",
    value: "1.2 kg",
    unit: "CO₂eq",
    timestamp: "1 day ago",
    status: "pending",
  },
  {
    id: "4",
    name: "Solar-Dried Components",
    pcfId: "INC-PCF-004",
    source: "EcoMetal Suppliers",
    value: "5.6 kg",
    unit: "CO₂eq",
    timestamp: "2 days ago",
  },
];

const mockOutgoingPCFs: PCFItem[] = [
  {
    id: "1",
    name: "Organic Cotton Classic Tee",
    pcfId: "OUT-PCF-001",
    source: "Fashion Forward Inc",
    value: "2.4 kg",
    unit: "CO₂eq",
    timestamp: "30 minutes ago",
  },
  {
    id: "2",
    name: "EcoFlex Denim Jeans",
    pcfId: "OUT-PCF-002",
    source: "Urban Retail Group",
    value: "5.8 kg",
    unit: "CO₂eq",
    timestamp: "3 hours ago",
    status: "pending",
  },
  {
    id: "3",
    name: "Recycled Sneakers Pro",
    pcfId: "OUT-PCF-003",
    source: "Fashion Forward Inc",
    value: "9.2 kg",
    unit: "CO₂eq",
    timestamp: "6 hours ago",
  },
  {
    id: "4",
    name: "EcoWarm Recycled Hoodie",
    pcfId: "OUT-PCF-004",
    source: "GreenWear Collective",
    value: "6.5 kg",
    unit: "CO₂eq",
    timestamp: "1 day ago",
    status: "pending",
  },
];

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

  const handleDeleteNode = async () => {
    if (!window.confirm("Are you sure you want to delete this node?")) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/nodes/${nodeId}`, {
        method: "DELETE",
      });

      if (response!.ok) {
        // Navigate back to nodes list after successful deletion
        navigate("/nodes");
      } else {
        const errorResponse = await response!.json();
        setErrorMessage(errorResponse.message || "Failed to delete node");
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
            <h2>Dashboard</h2>
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
            <h2>Dashboard</h2>
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
        {/* Header Section */}
        <Box
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Box>
            <Text
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#111827",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Dashboard
            </Text>
            <Text
              style={{
                fontSize: "14px",
                color: "#6B7280",
              }}
            >
              Node: {nodeData?.name || "Buyer 2 Shampoo"}
            </Text>
          </Box>
          <Button
            onClick={() => console.log("Add new PCF")}
          >
            Add New PCF
          </Button>
        </Box>

        {/* Stats Cards */}
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <StatCard
            title="Total Products"
            value={mockStats.totalProducts.value}
            subtitle={mockStats.totalProducts.subtitle}
            icon={<BarChartIcon width={20} height={20} />}
          />
          <StatCard
            title="PCF Records"
            value={mockStats.pcfRecords.value}
            subtitle={mockStats.pcfRecords.subtitle}
            icon={<ReaderIcon width={20} height={20} />}
          />
        </Box>

        {/* Main Content Grid */}
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "24px",
            marginBottom: "24px",
          }}
        >
          {/* Left Column - PCF Lists */}
          <Box style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <PCFList
              title="Incoming PCFs"
              subtitle="Recent PCFs received from connected instances"
              items={mockIncomingPCFs}
            />
            <PCFList
              title="Outgoing PCFs"
              subtitle="Recent PCFs shared with connected instances"
              items={mockOutgoingPCFs}
            />
          </Box>

          {/* Right Column - Quick Actions */}
          <Box style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <Box
              style={{
                background: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "24px",
              }}
            >
              <Text
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#111827",
                  marginBottom: "20px",
                  display: "block",
                }}
              >
                Quick Actions
              </Text>
              <Box style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Button
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "12px",
                  }}
                  onClick={() => console.log("Add product")}
                >
                  <PlusIcon width={18} height={18} />
                  Add New Product
                </Button>
                <Button
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "12px",
                  }}
                  onClick={() => console.log("Create PCF")}
                >
                  <FileTextIcon width={18} height={18} />
                  Create PCF Record
                </Button>
                <Button
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "12px",
                  }}
                  onClick={() => console.log("Import data")}
                >
                  <UploadIcon width={18} height={18} />
                  Import Data
                </Button>
                <Button
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "12px",
                  }}
                  onClick={() => navigate(`/edit-node/${nodeId}`)}
                >
                  <Pencil1Icon width={18} height={18} />
                  Edit Node
                </Button>
                <Button
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "12px",
                  }}
                  onClick={handleDeleteNode}
                >
                  <TrashIcon width={18} height={18} />
                  Delete Node
                </Button>
              </Box>
              <Box
                style={{
                  marginTop: "20px",
                  paddingTop: "20px",
                  borderTop: "1px solid #E5E7EB",
                }}
              >
                <Text
                  style={{
                    fontSize: "13px",
                    color: "#6B7280",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Need help getting started?
                </Text>
                <Text
                  onClick={() => console.log("View docs")}
                  style={{
                    fontSize: "13px",
                    color: "#0A0552",
                    fontWeight: "600",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  View Documentation
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </main>
    </>
  );
};

export default NodeDashboardPage;