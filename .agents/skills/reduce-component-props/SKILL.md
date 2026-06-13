---
name: reduce-component-props
description: "Use when a React component has too many props, trips local/no-large-component-props, or when refactoring component APIs that are getting wide."
---

# Reduce Component Props

Use this workflow when a component API is too wide. The goal is to make ownership clearer, not to hide many values behind one object.

## Read First

1. Read the component and its direct callers.
2. Group props by concern: data display, editing state, navigation, async state, layout, feature flags, callbacks, and labels/copy.
3. Identify which props are derivable from other props, hooks, route params, or local state.

## Preferred Fixes

Apply the smallest fix that makes the component easier to understand.

- Split unrelated concern groups into focused sibling or child components.
- Use wrapper or `children` composition when the parent is only arranging layout.
- Move hooks into the component that owns the data or behavior.
- Move derived values into the child when it already receives the source data.
- Move event handlers into the child when the child owns the interaction and the parent only forwards plumbing.
- Replace repeated prop groups with a named domain value only when that value is real in the product language.

## Avoid

- Do not replace many unrelated props with `config`, `options`, `state`, or `handlers` just to satisfy lint.
- Do not create a context provider for a single shallow prop chain unless it removes a real ownership problem.
- Do not merge multiple components into one file to make prop passing disappear.
- Do not move online-only hooks into offline-capable surfaces without checking the repo's `useOfflineQuery` convention.

## Completion Check

- The component definition is at or below the enforced prop limit.
- The remaining props describe one clear responsibility.
- Callers did not gain vague object assembly code.
- `pnpm lint` passes.
- Run `pnpm typecheck` when TypeScript ownership or data flow changed.
