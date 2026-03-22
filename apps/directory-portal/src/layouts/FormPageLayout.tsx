import React from "react";
import FunctionalPageLayout from "./FunctionalPageLayout";
import PageHeader from "../components/PageHeader";

interface FormPageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  loadingMessage?: string;
  maxWidth?: string;
}

const FormPageLayout: React.FC<FormPageLayoutProps> = ({
  title,
  subtitle,
  actions,
  children,
  loading,
  loadingMessage
}) => {
  return (
    <FunctionalPageLayout loading={loading} loadingMessage={loadingMessage}>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </FunctionalPageLayout>
  );
};

export default FormPageLayout;