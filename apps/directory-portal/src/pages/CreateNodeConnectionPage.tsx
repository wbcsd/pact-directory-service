import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FormPageLayout } from "../layouts";
import CreateNodeConnectionForm from "../components/CreateNodeConnectionForm";

const CreateNodeConnectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: fromNodeId } = useParams<{ id: string }>();

  return (
    <FormPageLayout title="Create Node Connection">
      <CreateNodeConnectionForm
        fromNodeId={fromNodeId ? Number(fromNodeId) : undefined}
        onCancel={() => navigate(`/nodes/${fromNodeId}/connections`)}
      />
    </FormPageLayout>
  );
};

export default CreateNodeConnectionPage;
