import React from "react";
import { Flex } from "@radix-ui/themes";
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
  loadingMessage = "Loading..."
}) => {
  return (
    <>
      <aside className="sidebar">
        <SideNav />
      </aside>
      { loading ? 
        <Flex p="5" width="100%" justify="center" align="center" direction="column" gap="5">
          <LoadingSpinner loadingText={loadingMessage} />
        </Flex>
       : 
        <main className="main">
          {children}
        </main>
      }
    </>
  );
};

export default FunctionalPageLayout;