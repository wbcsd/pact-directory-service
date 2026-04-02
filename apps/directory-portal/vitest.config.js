import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "pact-data-model": path.resolve(
        __dirname,
        "../../packages/pact-data-model/src/index.ts"
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setupTests.js"],
    globals: true, // optional, but convenient
    css: true, // lets Vitest handle CSS imports
    // If you import images/fonts, this keeps Vitest from choking on them:
    // You can also use a Vite plugin, but this is usually enough with "css: true".
  },
});
