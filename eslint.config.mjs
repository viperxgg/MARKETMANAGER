import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "next-env.d.ts"
    ]
  },
  js.configs.recommended,
  {
    // Node CLI scripts (verifiers, codegen, ops). Scoped so global lint
    // rules stay strict everywhere else.
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        URL: "readonly",
        AbortController: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly"
      }
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: {
        React: "readonly",
        console: "readonly",
        process: "readonly",
        FormData: "readonly",
        HTMLFormElement: "readonly"
      }
    },
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_"
        }
      ]
    }
  }
];
