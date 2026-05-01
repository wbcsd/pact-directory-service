import React from "react";
import { Box } from "@radix-ui/themes";
import HeroImage from "../assets/providers-header.webp";
import pactLogo from "../assets/pact-logo.svg";
import pactLogoDark from "../assets/pact-logo-dark.svg";
import SignUp from "../components/SignUp";

interface LandingPageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const LandingPageLayout: React.FC<LandingPageLayoutProps> = ({
  children,
  title = "Helping you adopt PACT standards",
}) => {
  return (
    <div className="layout">
      <header className="top-bar">
        <div className="logo">
          <picture>
            <source srcSet={pactLogoDark} media="(prefers-color-scheme: dark)" />
            <img width={153} src={pactLogo} alt="PACT Logo" />
          </picture>
        </div>
        <div className="top-bar-right">
          <SignUp />
        </div>
      </header>

      <div className="container">
      {/* Hero Section */}
      <Box
        style={{
          width: "589px",
          minWidth: "589px",
          minHeight: "800px",
          background: "var(--accent-9)",
          backgroundImage: `url(${HeroImage})`,
          backgroundPosition: "-230px +230px",
          backgroundSize: "180% auto",
          backgroundRepeat: "no-repeat",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#FFFFFF",
            width: "360px",
            margin: "0 auto",
            marginTop: "16%",
            fontSize: "1.8em",
          }}
        >
          {title}
        </h2>
      </Box>

      {/* Content Section */}
      <Box
        style={{
          padding: "20px",
          margin: "0 auto",
          flex: "1 1 100%",
          height: "100%",
        }}
      >
        <Box
          style={{
            maxWidth: "400px",
            margin: "0 auto",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {children}
        </Box>
      </Box>
      </div>
    </div>
  );
};

export default LandingPageLayout;