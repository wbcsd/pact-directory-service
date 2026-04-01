import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { FormPageLayout } from "../layouts";
import ProductFootprintForm, {
  ProductFootprintFormData,
} from "../components/ProductFootprintForm";
import { fetchWithAuth } from "../utils/auth-fetch";
import { formDataToProductFootprint } from "../models/pact-v3/form-to-footprint";

const AddProductFootprintPage: React.FC = () => {
  const { id: nodeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: ProductFootprintFormData) => {
    try {
      setIsSubmitting(true);
      const footprint = formDataToProductFootprint(data);
      const response = await fetchWithAuth(`/nodes/${nodeId}/footprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(footprint),
      });
      if (response?.ok) {
        navigate(`/nodes/${nodeId}`);
      }
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
    </FormPageLayout>
  );
};

export default AddProductFootprintPage;
