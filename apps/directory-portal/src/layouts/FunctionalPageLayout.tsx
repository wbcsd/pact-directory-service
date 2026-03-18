import React from "react";
import { Flex } from "@radix-ui/themes";
import SideNav from "../components/SideNav";
import LoadingSpinner from "../components/LoadingSpinner";

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
        <Flex p="5" width="100%" justify="center" align="center" direction="column" gap="5">
          <LoadingSpinner loadingText={loadingMessage} />
        </Flex>
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