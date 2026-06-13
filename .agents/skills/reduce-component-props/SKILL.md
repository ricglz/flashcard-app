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

## Preserve Existing Behavior Contracts

Before reducing props, identify which props are redundant and which props participate in a behavior contract. A prop may be necessary even if it looks derivable when it supports fallback behavior, loading behavior, authorization state, routing, error handling, or compatibility with an external API.

Do not remove, regroup, or hide those props unless the replacement preserves the same runtime behavior and makes the ownership clearer.

## Prefer Authoritative Sources

When a component already receives a domain object, prefer deriving identifiers and related values from that object instead of passing them separately. Only do this when the domain object is the authoritative source for those values.

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
- Do not satisfy the prop-count rule by wrapping unrelated props in a generic object.
- Do not replace explicit component contracts with hidden parsing of framework, library, or transport internals.
- Do not broaden a narrow lint fix into shared API changes unless the shared API is the actual source of the problem.
- Do not remove parent-side validation just because its return value is no longer passed down; first confirm whether it exists for routing, access control, fallback data, or fail-fast behavior.
- Do not create a context provider for a single shallow prop chain unless it removes a real ownership problem.
- Do not merge multiple components into one file to make prop passing disappear.
- Do not move online-only hooks into offline-capable surfaces without checking the repo's `useOfflineQuery` convention.

## Completion Check

- The component definition is at or below the enforced prop limit.
- The remaining props describe one clear responsibility.
- Existing behavior contracts are preserved or intentionally replaced with clearer ownership.
- Callers did not gain vague object assembly code.
- `pnpm lint` passes.
- Run `pnpm typecheck` when TypeScript ownership or data flow changed.

A good prop reduction removes duplication or clarifies ownership. A bad prop reduction merely moves complexity somewhere harder to see.
