import React from "react";
import { useNavigate } from "react-router-dom";
import NodeForm from "../components/NodeForm";
import { useAuth } from "../contexts/AuthContext";
import { FormPageLayout } from "../layouts";

const AddNodePage: React.FC = () => {
  const navigate = useNavigate();
  const { profileData } = useAuth();

  return (
    <FormPageLayout
      title={`Create node for ${profileData?.organizationName ?? ""}`}
    >
      <NodeForm
        onCancel={() => navigate("/organization/nodes")}
        onSaved={() => {
          setTimeout(() => navigate("/organization/nodes"), 1500);
        }}
      />
    </FormPageLayout>
  );
};

export default AddNodePage;