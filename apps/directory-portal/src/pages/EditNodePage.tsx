import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import NodeForm from "../components/NodeForm";
import { FormPageLayout } from "../layouts";

const EditNodePage: React.FC = () => {
  const navigate = useNavigate();
  const { id: nodeId } = useParams<{ id: string }>();

  return (
    <FormPageLayout title="Edit Node">
      <NodeForm
        nodeId={nodeId}
        onCancel={() => navigate("/organization/nodes")}
        onSaved={() => {
          // Stay on page — success callout is shown by NodeForm
        }}
      />
    </FormPageLayout>
  );
};

export default EditNodePage;