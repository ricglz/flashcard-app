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

## Ownership Check

Before using wrapper or `children` composition, verify the parent is only arranging external content. Do not move component-owned controls, mutations, derived UI, or domain-specific actions into the caller just to reduce the prop count.

Each new component must own a clear responsibility: behavior, state derivation, layout, or a real product concept. If the responsibility sentence is only "passes props to another component," delete the wrapper and use the existing component directly.

If the caller naturally owns the workflow composition, such as phase ordering, loading state, and which sections appear together, keep that composition in the caller and render focused child components directly.

Prefer moving hooks, mutation handlers, and derived state into the component when:

- The behavior is only used by that component.
- The parent only forwards values or callbacks.
- The child already has the domain data needed to perform the action.

If extracting a small subcomponent, check local React lint rules first. Some repos disallow multiple components per file, so the extraction may need a separate file.

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
