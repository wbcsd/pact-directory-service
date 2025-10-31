import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylisticTs from "@stylistic/eslint-plugin-ts";
import nodePlugin from "eslint-plugin-n";

export default tseslint.config(
  eslint.configs.recommended,
  nodePlugin.configs["flat/recommended-script"],
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    ignores: ["**/node_modules/*", "**/*.mjs", "**/*.js", "**/*.test.ts"],
  },
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        warnOnUnsupportedTypeScriptVersion: false,
        ecmaFeatures: {
          legacyDecorators: true,
        },
      },
    },
  },
  {
    plugins: {
      "@stylistic/ts": stylisticTs,
    },
  },
  { files: ["**/*.ts"] },
  {
    rules: {
      "@typescript-eslint/no-misused-promises": 0,
      "@typescript-eslint/no-floating-promises": 0,
      "@typescript-eslint/no-confusing-void-expression": 0,
      "@typescript-eslint/no-unnecessary-condition": 0,
      "@typescript-eslint/no-explicit-any": 0,
      "@typescript-eslint/no-unsafe-assignment": 0,
      "@typescript-eslint/no-unsafe-argument": 0,
      "@typescript-eslint/no-unsafe-member-access": 0,
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "max-len": [
        "warn",
        {
          code: 120,
        },
      ],
      "@stylistic/ts/semi": ["warn"],
      "comma-dangle": [
        "warn",
        {
          arrays: "always-multiline",
          objects: "always-multiline",
          imports: "always-multiline",
          exports: "always",
          functions: "never",
        },
      ],
      "no-console": 1,
      "no-extra-boolean-cast": 0,
      "n/no-process-env": 0,
      "n/no-process-exit": 0,
      "n/no-missing-import": 0,
      "n/no-unpublished-import": 0,
      indent: ["warn", 2, { SwitchCase: 1 }],
      quotes: ["warn", "single", { avoidEscape: true }],
    },
    settings: {
      node: {
        version: ">=21.0.0",
      },
    },
  },
{
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-console": "off",
      "max-len": ["warn", { code: 140 }],
    },
  },
);
