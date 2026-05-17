import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const reactPlugin = nextVitals.find(c => c.plugins?.react)?.plugins.react;

const typeAwareRulesOff = {
  "@typescript-eslint/no-unnecessary-condition": "off",
  "@typescript-eslint/consistent-type-imports": "off",
  "@typescript-eslint/switch-exhaustiveness-check": "off",
  "@typescript-eslint/no-floating-promises": "off",
  "@typescript-eslint/no-misused-promises": "off",
  "@typescript-eslint/prefer-nullish-coalescing": "off",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "convex/_generated/**",
    "public/sw.js",
    "scripts/**",
  ]),
  {
    plugins: {
      react: reactPlugin,
    },
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
      "react/no-unstable-nested-components": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "eqeqeq": ["error", "always"],
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
        fixStyle: "separate-type-imports",
        disallowTypeAnnotations: false,
      }],
      "@typescript-eslint/switch-exhaustiveness-check": ["error", {
        requireDefaultForNonUnion: true,
      }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", {
        checksVoidReturn: { attributes: false },
      }],
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "max-lines-per-function": ["error", {
        max: 175,
        skipBlankLines: true,
        skipComments: true,
      }],
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
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "e2e/**"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    files: ["src/sw.ts"],
    languageOptions: {
      parserOptions: { projectService: false },
    },
    rules: typeAwareRulesOff,
  },
  {
    files: ["tests/**"],
    languageOptions: {
      parserOptions: { projectService: false },
    },
    rules: typeAwareRulesOff,
  },
  {
    files: ["*.mjs"],
    languageOptions: {
      parserOptions: { projectService: false },
    },
    rules: typeAwareRulesOff,
  },
]);

export default eslintConfig;
