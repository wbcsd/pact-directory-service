import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideNav from "../components/SideNav";
import NodeForm from "../components/NodeForm";
import "./EditUserPage.css";

const EditNodePage: React.FC = () => {
  const navigate = useNavigate();
  const { id: nodeId } = useParams<{ id: string }>();

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <h2>Edit Node</h2>
        </div>
        <div>
          <NodeForm
            nodeId={nodeId}
            onCancel={() => navigate("/organization/nodes")}
            onSaved={() => {
              // Stay on page — success callout is shown by NodeForm
            }}
          />
        </div>
      </main>
    </>
  );
};

export default EditNodePage;