import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Auto-generated Convex files:
    "convex/_generated/**",
    // Generated service worker:
    "public/sw.js",
    // Build scripts:
    "scripts/**",
  ]),
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
      "react/no-multi-comp": ["error", { ignoreStateless: false }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "eqeqeq": ["error", "always"],
      "@typescript-eslint/no-unnecessary-condition": "error",
      "max-lines-per-function": ["error", {
        max: 175,
        skipBlankLines: true,
        skipComments: true,
      }],
      // Ban dangerous type assertions
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression[typeAnnotation.type='TSNeverKeyword']",
          message: "'as never' is forbidden. This indicates a type system escape hatch. Use proper typing or @ts-expect-error with explanation instead.",
        },
        {
          selector: "TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
          message: "'as unknown' is forbidden. Use @ts-expect-error with explanation or proper typing instead.",
        },
      ],
    },
  },
  {
    files: ["src/sw.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
]);

export default eslintConfig;
