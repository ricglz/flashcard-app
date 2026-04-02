# Frontend (src/)

## Conventions
- Pages are Server Components by default; add `"use client"` only when interactivity is needed
- Convex hooks (`useQuery`, `useMutation`) require `"use client"` components
- Use `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>` from `"convex/react"` for auth gating
- Use `useConvexAuth()` (not Clerk's `useAuth()`) when checking auth state in components
- TTS config derived from field metadata via `getTtsConfig()` in `lib/types.ts`
- Import paths use `@/` alias (maps to `src/`)

## Component Organization
- `components/` — reusable UI components
- `app/` — page components (route-based)
- `lib/` — types, utilities, parsers (no React dependencies)
