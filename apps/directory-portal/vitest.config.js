import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setupTests.js"],
    globals: true, // optional, but convenient
    css: true, // lets Vitest handle CSS imports
    // If you import images/fonts, this keeps Vitest from choking on them:
    // You can also use a Vite plugin, but this is usually enough with "css: true".
  },
}));
