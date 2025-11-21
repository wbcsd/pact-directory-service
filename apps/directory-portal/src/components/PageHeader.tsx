import React from "react";

interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
  subtitle?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, actions, subtitle }) => {
  return (
    <div className="header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p style={{ margin: "5px 0 0 0", color: "#666" }}>{subtitle}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
};

export default PageHeader;