import React from "react";
import { useNavigate } from "react-router-dom";

interface NodeLinkProps {
  id: number;
  name: string;
}

const NodeLink: React.FC<NodeLinkProps> = ({ id, name }) => {
  const navigate = useNavigate();
  return (
    <a
      href={`/nodes/${id}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/nodes/${id}`); }}
      style={{ color: 'var(--accent-11)', textDecoration: 'none', fontWeight: 500 }}
    >
      {name}
    </a>
  );
};

export default NodeLink;
