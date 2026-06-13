# Component Prop Limit Guardrail Design

## Context

Agents have been refactoring React components into wide APIs with many props. That is usually a sign that a component is doing too much or that data ownership has moved to the wrong level. The guardrail should target the bad component API, not callers.

The current codebase has 151 counted React component-like definitions in `src/**/*.tsx` excluding tests. A threshold of 5 props would flag 22 existing components. A threshold of 8 props would flag 10 existing components, which better matches the currently severe cases without turning the initial rule into broad cleanup.

## Design

Add a repo-local ESLint rule for component definitions only.

- The rule flags React component definitions whose declared API has more than 8 props.
- It counts destructured component parameters, inline object prop types, and local `Props` type/interface declarations used by the component.
- It excludes `children`.
- For UI primitives that extend native attributes, it counts only the component's own declared props and does not expand inherited DOM props.
- It does not count JSX call-site props.
- It allows normal ESLint disable comments for rare exceptions; existing `reportUnusedDisableDirectives: "error"` keeps stale disables from accumulating.

The lint failure message should tell agents to reduce the component API by splitting focused subcomponents, using wrapper or child composition, or moving derivable data, hooks, and handlers into the component that owns the concern.

## Skill

Add `.agents/skills/reduce-component-props/SKILL.md` with a concrete repair workflow:

- Identify whether the props are unrelated concern groups, layout/composition options, derivable data, or parent-owned event plumbing.
- Split presentational subcomponents when separate concern groups are visible.
- Prefer wrapper or `children` composition when the parent is only arranging layout.
- Move hooks, derived values, and handlers into the child when that child owns the behavior.
- Avoid hiding many unrelated props inside a vague `config` object unless it represents a real domain value.
- Re-run lint and typecheck after the change.

Symlink `.claude/skills/reduce-component-props` to the `.agents` skill so there is one source of truth.

## Backlog Follow-Up

Add a forward-looking backlog item to evaluate lowering the enforced limit after the worst offenders are addressed. The intended target is 5 props if the codebase shape supports it without noisy exceptions.

## Testing

Verification should include:

- `pnpm lint`
- focused unit coverage for the local ESLint rule if the rule has meaningful branching that is not covered by linting the current repository

