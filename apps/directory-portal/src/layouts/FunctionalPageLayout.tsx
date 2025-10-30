import React from "react";
import { Box } from "@radix-ui/themes";
import SideNav from "../components/SideNav";
import LoadingSpinner from "../components/LoadingSpinner";

interface FunctionalPageLayoutProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingMessage?: string;
}

const FunctionalPageLayout: React.FC<FunctionalPageLayoutProps> = ({
  children,
  loading = false,
  loadingMessage = "Loading...",
}) => {
  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      
      {loading ? (
        <Box
          style={{
            padding: "20px",
            verticalAlign: "middle",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <LoadingSpinner loadingText={loadingMessage} />
        </Box>
      ) : (
        <main className="main">
          {children}
        </main>
      )}
    </>
  );
};

export default FunctionalPageLayout;