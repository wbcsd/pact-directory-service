import React from "react";
import { useNavigate } from "react-router-dom";
import SideNav from "../components/SideNav";
import NodeForm from "../components/NodeForm";
import "./EditUserPage.css";
import { useAuth } from "../contexts/AuthContext";

const AddNodePage: React.FC = () => {
  const navigate = useNavigate();
  const { profileData } = useAuth();

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <h2>Create node for {profileData?.organizationName}</h2>
        </div>
        <div>
          <NodeForm
            onCancel={() => navigate("/organization/nodes")}
            onSaved={() => {
              setTimeout(() => navigate("/organization/nodes"), 1500);
            }}
          />
        </div>
      </main>
    </>
  );
};

export default AddNodePage;