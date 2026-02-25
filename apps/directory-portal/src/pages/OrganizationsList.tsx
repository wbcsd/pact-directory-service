import React, { useState, useCallback } from "react";
import { fetchWithAuth } from "../utils/auth-fetch";
import PaginatedDataTable, { PaginationInfo } from "../components/PaginatedDataTable";
import { Column } from "../components/DataTable";
import { InputIcon } from "@radix-ui/react-icons";
import { GridPageLayout } from "../layouts";
import ActionButton from "../components/ActionButton";
import SlideOverPanel from "../components/SlideOverPanel";
import OrganizationForm from "../components/OrganizationForm";

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

type PanelState =
  | { mode: "closed" }
  | { mode: "edit"; organizationId: number; organizationName: string };

const Organizations: React.FC = () => {
  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const closePanel = useCallback(() => setPanel({ mode: "closed" }), []);

  const handleSaved = useCallback(() => {
    // Refresh the table data to reflect changes
    setRefreshTrigger((prev) => prev + 1);
    // Auto-close after a short delay so the user sees the success message
    setTimeout(() => closePanel(), 1200);
  }, [closePanel]);

  // Fetch function for DataTableWithSearch
  const fetchOrganizations = async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: Organization[]; pagination: PaginationInfo }> => {
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
      extendedStyle: { textAlign: 'right' },
      render: (row: Organization) => (
        <ActionButton
          title="Edit Organization Details"
          variant="secondary"
          size="small"
          onClick={() =>
            setPanel({
              mode: "edit",
              organizationId: row.id,
              organizationName: row.organizationName,
            })
          }
        >
          <InputIcon />
        </ActionButton>
      ),
    },
  ];

  const panelTitle =
    panel.mode === "edit" ? "Edit Organization" : "";

  const panelSubtitle =
    panel.mode === "edit" ? panel.organizationName : undefined;

  return (
    <GridPageLayout
      title="Organizations"
      subtitle="Manage and view all organizations in the system"
      loading={false}
      loadingMessage="Loading organizations..."
    >
      <PaginatedDataTable<Organization>
        isSearchable={true}
        searchPlaceholder="Search by organization name..."
        fetchData={fetchOrganizations}
        columns={columns}
        idColumnName="id"
        refreshTrigger={refreshTrigger}
        emptyState={{
          title: "No organizations found",
          description: "No organizations match your search criteria",
        }}
      />

      {/* Slide-over panel for Edit */}
      <SlideOverPanel
        open={panel.mode !== "closed"}
        onClose={closePanel}
        title={panelTitle}
        subtitle={panelSubtitle}
      >
        {panel.mode === "edit" && (
          <OrganizationForm
            key={panel.organizationId}
            organizationId={panel.organizationId}
            onCancel={closePanel}
            onSaved={handleSaved}
          />
        )}
      </SlideOverPanel>
    </GridPageLayout>
  );
};

export default Organizations;