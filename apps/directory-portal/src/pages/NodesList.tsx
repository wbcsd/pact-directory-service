import React from "react";
import { fetchWithAuth } from "../utils/auth-fetch";
import SearchableDataTable, { PaginationInfo } from "../components/SearchableDataTable";
import { Column } from "../components/DataTable";
import { useAuth } from "../contexts/AuthContext";
import { InputIcon } from "@radix-ui/react-icons";
import { useNavigate } from "react-router-dom";
import { GridPageLayout } from "../layouts";
import ActionButton from "../components/ActionButton";

export interface Node {
  id: number;
  organizationId: number;
  organizationName: string;
  name: string;
  type: 'internal' | 'external';
  apiUrl?: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
}

const NodesList: React.FC = () => {
  const navigate = useNavigate();
  const { profileData } = useAuth();

  // Fetch function for DataTableWithSearch
  const fetchNodes = async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: Node[]; pagination: PaginationInfo }> => {
    if (!profileData) {
      throw new Error("Profile data not available");
    }

    // Build query string
    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    });

    if (params.search) {
      queryParams.append("search", params.search);
    }

    const response = await fetchWithAuth(
      `/organizations/${profileData.organizationId}/nodes?${queryParams.toString()}`
    );
    
    if (!response || !response.ok) {
      throw new Error("Failed to fetch nodes");
    }

    const result = await response.json();
    return result;
  };

  const columns: Column<Node>[] = [
    {
      key: "name",
      header: "Node Name",
      sortable: true,
      sortValue: (row: Node) => row.name,
      render: (row: Node) => row.name,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (row: Node) => row.type,
      render: (row: Node) => (
        <span style={{ textTransform: 'capitalize' }}>{row.type}</span>
      ),
    },
    {
      key: "apiUrl",
      header: "API URL",
      sortable: false,
      render: (row: Node) => row.apiUrl || "—",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row: Node) => row.status,
      render: (row: Node) => (
        <span style={{ textTransform: 'capitalize' }}>{row.status}</span>
      ),
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      sortable: true,
      sortValue: (row: Node) => {
        const date = new Date(row.updatedAt);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      },
      render: (row: Node) => {
        const date = new Date(row.updatedAt);
        return isNaN(date.getTime())
          ? "—"
          : date.toLocaleDateString() + " " + date.toLocaleTimeString();
      },
    },
    {
      key: "actions",
      header: "",
      extendedStyle: { textAlign: 'right' },
      render: (row: Node) => (
        <ActionButton
          title="Edit Node Details"
          variant="secondary"
          size="small"
          onClick={() => navigate(`/edit-node/${row.id}`)}
        >
          <InputIcon />
        </ActionButton>
      ),
    },
  ];

  return (
    <GridPageLayout
      title=""
      loading={false}
      loadingMessage="Loading nodes..."
    >
      <SearchableDataTable<Node>
        title="Nodes"
        subtitle="Manage and view all nodes in your organization"
        searchPlaceholder="Search by node name..."
        fetchData={fetchNodes}
        columns={columns}
        idColumnName="id"
        defaultPageSize={50}
        emptyState={{
          title: "No nodes found",
          description: "No nodes match your search criteria",
        }}
      />
    </GridPageLayout>
  );
};

export default NodesList;
