# Convex Backend

## Conventions
- Schema defined in `schema.ts` with Convex validators (`v.*`)
- Functions organized by domain: `flashcardSets.ts`, `flashcards.ts`, `studySessions.ts`
- All mutations/queries must check auth: `const identity = await ctx.auth.getUserIdentity()`
- Use `v.record(v.string(), v.any())` for generic metadata, typed in application code
- `fieldDefinitions` stored as `v.array(v.object({...}))` on flashcard sets
- Card `fields` stored as `v.record(v.string(), v.string())` — keys match field definition names

## Auth
- Clerk integration via `auth.config.ts`
- `CLERK_JWT_ISSUER_DOMAIN` must be set in Convex Dashboard (not .env.local)
- User identity available via `ctx.auth.getUserIdentity()` — `subject` is the Clerk user ID
