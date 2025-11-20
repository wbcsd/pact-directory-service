import React from "react";
import { fetchWithAuth } from "../utils/auth-fetch";
import SearchableDataTable, { PaginationInfo } from "../components/SearchableDataTable";
import { Column } from "../components/DataTable";
import { useAuth } from "../contexts/AuthContext";
import { InputIcon } from "@radix-ui/react-icons";
import { useNavigate } from "react-router-dom";
import { GridPageLayout } from "../layouts";
import ActionButton from "../components/ActionButton";

export interface Organization {
  id: number;
  organizationName: string;
  organizationIdentifier: string;
  organizationDescription: string;
  networkKey: string;
  parentId: number;
  userCount: string | number;
  lastActivity: string | null;
  status: 'active' | 'disabled';
}

const Organizations: React.FC = () => {
  const navigate = useNavigate();
  const { profileData } = useAuth();

  // Fetch function for DataTableWithSearch
  const fetchOrganizations = async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: Organization[]; pagination: PaginationInfo }> => {
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

    const response = await fetchWithAuth(`/organizations?${queryParams.toString()}`);
    
    if (!response || !response.ok) {
      throw new Error("Failed to fetch organizations");
    }

    const result = await response.json();
    return result;
  };

  const columns: Column<Organization>[] = [
    {
      key: "organizationName",
      header: "Organization Name",
      sortable: true,
      sortValue: (row: Organization) => row.organizationName,
      render: (row: Organization) => row.organizationName,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row: Organization) => row.status,
      render: (row: Organization) => row.status,
    },
    {
      key: "userCount",
      header: "Registered Users",
      sortable: true,
      sortValue: (row: Organization) => Number(row.userCount),
      render: (row: Organization) => row.userCount.toString(),
    },
    {
      key: "lastActivity",
      header: "Last Activity",
      sortable: true,
      sortValue: (row: Organization) => {
        const date = new Date(row.lastActivity ?? "");
        return isNaN(date.getTime()) ? 0 : date.getTime();
      },
      render: (row: Organization) => {
        const date = new Date(row.lastActivity ?? "");
        return isNaN(date.getTime())
          ? "—"
          : date.toLocaleDateString() + " " + date.toLocaleTimeString();
      },
    },
    {
      key: "actions",
      header: "",
      render: (row: Organization) => (
        <ActionButton
          title="Edit Organization Details"
          variant="secondary"
          size="small"
          onClick={() => navigate(`/organizations/${row.id}`)}
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
      loadingMessage="Loading organizations..."
    >
      <SearchableDataTable<Organization>
        title="Organizations"
        subtitle="Manage and view all organizations in the system"
        searchPlaceholder="Search by organization name..."
        fetchData={fetchOrganizations}
        columns={columns}
        idColumnName="id"
        defaultPageSize={50}
        emptyState={{
          title: "No organizations found",
          description: "No organizations match your search criteria",
        }}
      />
    </GridPageLayout>
  );
};

export default Organizations;