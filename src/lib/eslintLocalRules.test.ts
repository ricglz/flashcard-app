import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import localRules from "../../eslint-local-rules/index.mjs";

async function lintCode(
  code: string,
  rules: ESLint.ConfigData["rules"] = {
    "local/no-passthrough-component-wrapper": "error",
  },
) {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.jsx"],
        plugins: {
          local: localRules as ESLint.Plugin,
        },
        languageOptions: {
          ecmaVersion: 2024,
          sourceType: "module",
          parserOptions: {
            ecmaFeatures: {
              jsx: true,
            },
          },
        },
        rules,
      },
    ],
  });

  return eslint.lintText(code, { filePath: "src/Example.jsx" });
}

describe("local/no-passthrough-component-wrapper", () => {
  it("reports components that only forward their props to one custom child", async () => {
    const [result] = await lintCode(`
      export default function GenerateDraftCardList({
        cards,
        onToggle,
        onEdit,
        locked,
      }) {
        return (
          <CardPreviewList
            cards={cards}
            disabled={locked}
            onToggle={onToggle}
            onEdit={onEdit}
          />
        );
      }
    `);

    expect(result?.messages).toEqual([
      expect.objectContaining({
        messageId: "passthroughWrapper",
        ruleId: "local/no-passthrough-component-wrapper",
      }),
    ]);
  });

  it("ignores components that add local layout or non-forwarded child props", async () => {
    const [result] = await lintCode(`
      export default function GeneratePreviewActions({
        selectedCount,
        totalCount,
        onBack,
        onConfirm,
        locked,
      }) {
        return (
          <div className="flex">
            <p>{selectedCount} of {totalCount} cards included</p>
            <Button onClick={onBack} disabled={locked}>Back</Button>
            <Button onClick={onConfirm} disabled={selectedCount === 0 || locked}>
              Create Set ({selectedCount} cards)
            </Button>
          </div>
        );
      }

      export function PrimaryButton({ label, onClick, disabled }) {
        return (
          <Button variant="primary" onClick={onClick} disabled={disabled}>
            {label}
          </Button>
        );
      }
    `);

    expect(result?.messages).toEqual([]);
  });
});

describe("local/no-ignored-return-values", () => {
  const rule = {
    "local/no-ignored-return-values": [
      "error",
      {
        functions: [
          {
            name: "requirePreloadedDomainResult",
            message: "Use the returned value or call assertPreloadedDomainResult.",
          },
        ],
      },
    ],
  } satisfies ESLint.ConfigData["rules"];

  it("reports configured function calls whose return values are ignored", async () => {
    const [result] = await lintCode(`
      requirePreloadedDomainResult(preloadedCards);
      await requirePreloadedDomainResult(preloadedCards);
      void routePreload.requirePreloadedDomainResult(preloadedCards);
    `, rule);

    expect(result?.messages).toEqual([
      expect.objectContaining({
        messageId: "ignoredReturn",
        ruleId: "local/no-ignored-return-values",
      }),
      expect.objectContaining({
        messageId: "ignoredReturn",
        ruleId: "local/no-ignored-return-values",
      }),
      expect.objectContaining({
        messageId: "ignoredReturn",
        ruleId: "local/no-ignored-return-values",
      }),
    ]);
  });

  it("allows configured function calls when the return value is consumed", async () => {
    const [result] = await lintCode(`
      const setData = requirePreloadedDomainResult(preloadedSet);
      function loadSet() {
        return requirePreloadedDomainResult(preloadedSet);
      }
    `, rule);

    expect(result?.messages).toEqual([]);
  });
});
