import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

const extensionGlobals = {
  ...globals.browser,
  ...globals.webextensions,
};

export default [
  {
    ignores: [
      "node_modules/**",
      ".setup/**",
      ".cursor/**",
      ".agents/**",
      ".retornatus/**",
      "extension/icons/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["extension/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: extensionGlobals,
    },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["extension/background.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...extensionGlobals,
        ...globals.serviceworker,
      },
    },
  },
  {
    files: ["tests/**/*.js", "eslint.config.js", "playwright.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.webextensions,
      },
    },
  },
  prettier,
];
