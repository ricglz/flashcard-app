# Flashcard App

## Overview
Chinese-first flashcard PWA with generic field-based data model. Built with Next.js 16 (App Router) + Convex + Clerk + Tailwind CSS.

## Dev Commands
```bash
pnpm dev          # Start Next.js dev server (with Turbopack)
pnpx convex dev   # Start Convex dev server (run in separate terminal)
pnpm build        # Production build
pnpm lint         # ESLint
```

## Project Structure
```
src/
  app/             # Next.js App Router pages
  components/      # React components
  lib/             # Shared types, utilities, helpers
convex/            # Convex backend (schema, functions)
```

## Key Conventions
- **Package manager**: pnpm
- **Import alias**: `@/` maps to `src/`
- **Components**: PascalCase, `.tsx` extension, `"use client"` only when needed
- **Next.js 16**: `params` is a `Promise` — must be awaited in page components
- **Convex functions**: always check auth via `ctx.auth.getUserIdentity()`
- **Single source of truth types**: `FieldRole`, `FieldMetadata`, `SessionStatus` in `src/lib/types.ts`
- **Metadata pattern**: feature-specific config (e.g., TTS) lives in `FieldMetadata` typed blocks — presence = enabled

## Product Decisions
Full product context: `~/.claude/context/flashcard-app-product-decisions.md`

@AGENTS.md

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
