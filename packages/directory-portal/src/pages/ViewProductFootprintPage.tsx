import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Callout } from "@radix-ui/themes";
import { ArrowLeftIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { FormPageLayout } from "../layouts";
import { ProductFootprint } from "pact-data-model/v3_0";
import ProductFootprintForm from "../components/ProductFootprintForm";
import { fetchWithAuth } from "../utils/auth-fetch";

const ViewProductFootprintPage: React.FC = () => {
  const { nodeId, pcfId } = useParams<{ nodeId: string; pcfId: string }>();
  const navigate = useNavigate();
  const [footprint, setFootprint] = useState<ProductFootprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPcf = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchWithAuth(`/footprints/${pcfId}`);
        if (!response?.ok) throw new Error("Failed to fetch PCF");
        const result = await response.json();
        setFootprint(result.data as ProductFootprint);
      } catch {
        setError("Failed to load PCF data.");
      } finally {
        setLoading(false);
      }
    };
    fetchPcf();
  }, [pcfId]);

  return (
    <FormPageLayout
      title={footprint ? `Footprint : ${footprint.productNameCompany}` : "View Product Carbon Footprint"}
      subtitle={footprint ? `${footprint.companyName} ${footprint.productIds[0]}` : "Detailed information about the product's carbon footprint"}
      loading={loading}
      loadingMessage="Loading PCF data..."
      actions={
        <Button variant="soft" onClick={() => navigate(`/nodes/${nodeId}`)}>
          <ArrowLeftIcon /> Back to Node
        </Button>
      }
    >
      {error && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {footprint && (
        <ProductFootprintForm
          initialData={footprint}
          readOnly
        />
      )}
    </FormPageLayout>
  );
};

export default ViewProductFootprintPage;
