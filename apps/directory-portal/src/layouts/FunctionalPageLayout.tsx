import React from "react";
import { Box } from "@radix-ui/themes";
import SideNav from "../components/SideNav";
import Spinner from "../components/LoadingSpinner";

interface FunctionalPageLayoutProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingMessage?: string;
  /** When false, children are rendered directly without a <main> wrapper.
   *  Useful for pages with multi-pane layouts (e.g. main + side panel). */
  wrapInMain?: boolean;
}

const FunctionalPageLayout: React.FC<FunctionalPageLayoutProps> = ({
  children,
  loading = false,
  loadingMessage = "Loading...",
  wrapInMain = true,
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
          <Spinner loadingText={loadingMessage} />
        </Box>
      ) : wrapInMain ? (
        <main className="main">
          {children}
        </main>
      ) : (
        children
      )}
    </>
  );
};

export default FunctionalPageLayout;