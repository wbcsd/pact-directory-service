import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Callout } from "@radix-ui/themes";
import { ArrowLeftIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { FormPageLayout } from "../layouts";
import { ProductFootprint } from "pact-data-model/v3_0";
import ProductFootprintForm from "../components/ProductFootprintForm";
import { fetchWithAuth } from "../utils/auth-fetch";

const AddProductFootprintPage: React.FC = () => {
  const { id: nodeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ProductFootprint) => {
    try {
      setIsSubmitting(true);
      setError(null);
      // Create new guid for the footprint ID and set required fields
      (data as any).id = crypto.randomUUID();
      (data as any).specVersion = "3.0.0";
      (data as any).created = new Date().toISOString();
      const response = await fetchWithAuth(`/nodes/${nodeId}/footprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response?.ok) {
        navigate(`/nodes/${nodeId}`);
      } else {
        const body = await response?.json().catch(() => null);
        setError(body?.message ?? "Failed to save footprint. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title="Add Product Carbon Footprint"
      actions={
        <Button variant="soft" onClick={() => navigate(`/nodes/${nodeId}`)}>
          <ArrowLeftIcon /> Back to Node
        </Button>
      }
    >
      <ProductFootprintForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
      {error && (
        <Callout.Root color="bronze" highContrast variant="surface" mt="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
    </FormPageLayout>
  );
};

export default AddProductFootprintPage;
