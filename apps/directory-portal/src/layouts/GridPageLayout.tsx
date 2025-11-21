import React from "react";
import FunctionalPageLayout from "./FunctionalPageLayout";
import PageHeader from "../components/PageHeader";

interface GridPageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  loadingMessage?: string;
}

const GridPageLayout: React.FC<GridPageLayoutProps> = ({
  title,
  subtitle,
  actions,
  children,
  loading,
  loadingMessage,
}) => {
  return (
    <FunctionalPageLayout loading={loading} loadingMessage={loadingMessage}>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <div>{children}</div>
    </FunctionalPageLayout>
  );
};

export default GridPageLayout;