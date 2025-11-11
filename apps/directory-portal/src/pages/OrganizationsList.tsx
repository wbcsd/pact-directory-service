import React, { useEffect } from "react";
import { fetchWithAuth } from "../utils/auth-fetch";
import DataTable, { Column } from "../components/DataTable";
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
}

const Organizations: React.FC = () => {
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();
  const { profileData } = useAuth();

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!profileData) return;

      try {
        setLoading(true);
        const response = await fetchWithAuth("/organizations");

        if (response!.ok) {
          const result = await response!.json();
          setOrganizations(result.data);
        } else {
          console.error("Failed to fetch organizations");
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [profileData]);

  const columns: Column<Organization>[] = [
    {
      key: "organizationName",
      header: "Organization Name",
      sortable: true,
      sortValue: (row: Organization) => row.organizationName,
      render: (row: Organization) => row.organizationName,
    },
    {
      key: "organizationIdentifier",
      header: "Identifier",
      sortable: true,
      sortValue: (row: Organization) => row.organizationIdentifier,
      render: (row: Organization) => row.organizationIdentifier,
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
          variant="secondary"
          size="small"
          onClick={() => navigate(`/organizations/${row.id}`)}
        >
          <InputIcon />
          View
        </ActionButton>
      ),
    },
  ];

  return (
    <GridPageLayout
      title="Organizations"
      loading={loading}
      loadingMessage="Loading organizations..."
    >
      <DataTable idColumnName="id" columns={columns} data={organizations} />
    </GridPageLayout>
  );
};

export default Organizations;