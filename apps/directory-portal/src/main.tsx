import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./index.css";
import App from "./App.tsx";

function useSystemTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return theme;
}

function SystemTheme() {
  const theme = useSystemTheme();
  return (
    <Theme accentColor="indigo" grayColor="slate" radius="small" scaling="100%" appearance={theme}>
      <App />
    </Theme>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SystemTheme />
  </StrictMode>
);
