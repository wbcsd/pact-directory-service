import React from "react";
import { Box } from "@radix-ui/themes";
import FunctionalPageLayout from "./FunctionalPageLayout";
import PageHeader from "../components/PageHeader";

interface FormPageLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  loadingMessage?: string;
  maxWidth?: string;
}

const FormPageLayout: React.FC<FormPageLayoutProps> = ({
  title,
  subtitle,
  children,
  loading,
  loadingMessage,
  maxWidth = "800px",
}) => {
  return (
    <FunctionalPageLayout loading={loading} loadingMessage={loadingMessage}>
      <PageHeader title={title} subtitle={subtitle} />
      <div>
        <Box 
          className="form-container" 
          style={{ 
            maxWidth,
            margin: "0 auto"
          }}
        >
          {children}
        </Box>
      </div>
    </FunctionalPageLayout>
  );
};

export default FormPageLayout;