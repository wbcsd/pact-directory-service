import React, { useState } from "react";
import { Flex, IconButton } from "@radix-ui/themes";
import { HamburgerMenuIcon, Cross2Icon } from "@radix-ui/react-icons";
import SideNav from "../components/SideNav";
import LoadingSpinner from "../components/LoadingSpinner";
import SignUp from "../components/SignUp";
import pactLogo from "../assets/pact-logo.svg";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="layout">
      <header className="top-bar">
        <div className="hamburger">
          <IconButton
            className="hamburger-button"
            variant="ghost"
            size="3"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen
              ? <Cross2Icon width={20} height={20} />
              : <HamburgerMenuIcon width={20} height={20} />}
          </IconButton>
        </div>
        <div className="logo">
          <img width={153} src={pactLogo} alt="PACT Logo" />
        </div>
        <div className="top-bar-right">
          <SignUp />
        </div>
      </header>

      <div className="container">
        {mobileMenuOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          className={`sidebar${mobileMenuOpen ? " sidebar--open" : ""}`}
          onClick={() => setMobileMenuOpen(false)}
        >
          <SideNav />
        </aside>

        {loading ? (
          <Flex p="5" width="100%" justify="center" align="center" direction="column" gap="5">
            <LoadingSpinner loadingText={loadingMessage} />
          </Flex>
        ) : (
          <main className="main">
            {children}
          </main>
        )}
      </div>
    </div>
  );
};

export default FunctionalPageLayout;