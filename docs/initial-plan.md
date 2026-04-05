# Flashcard App — Phase 1 MVP Implementation Plan

## Context

Building a Chinese flashcard PWA from scratch at `~/play-repos/flashcard-app`. The user is learning Chinese and wants an interactive study tool with TTS, self-rated scoring, configurable study directions, and CSV import. The data model is generic (field-based) so it can support any language/subject, but the UX is Chinese-first.

Full product decisions: `~/.claude/context/flashcard-app-product-decisions.md`

## Stack

- **Next.js 15** (App Router) + **Convex** + **Clerk** + **Tailwind CSS**
- **pnpm** as package manager
- Scaffold via `pnpm create convex@latest -- -t nextjs-clerk`

---

## Implementation Steps

### Step 1: Project Scaffold
- Run `pnpm create convex@latest -- -t nextjs-clerk` to create `flashcard-app`
- Verify the template structure, clean up boilerplate

### Step 2: CLAUDE.md & PROGRESS.md (early, for session resilience)
- Create `CLAUDE.md` at project root — project conventions, dev commands, architecture notes
- Create `convex/CLAUDE.md` — Convex-specific patterns (schema, function conventions)
- Create `src/CLAUDE.md` — frontend conventions (component patterns, hooks)
- Create `PROGRESS.md` at project root — tracks what's done vs remaining, references the plan file at `~/.claude/plans/sunny-dancing-fern.md` for full context

### Step 3: Shared Types & Constants
**File: `src/lib/types.ts`** — single source of truth for shared types

```ts
// FieldRole enum — THE canonical list of field roles
export const FIELD_ROLES = ["primary", "pronunciation", "definition", "note"] as const;
export type FieldRole = (typeof FIELD_ROLES)[number];

// FieldMetadata — structured typed blocks. Presence of a block = feature enabled.
// This is THE canonical definition of all metadata blocks. Documented here, validated here.
type FieldMetadata = {
  tts?: {
    lang: string;   // BCP-47 language tag, e.g., "zh-CN", "es"
  };
  // Future blocks (extend here):
  // display?: { fontSize: "small" | "normal" | "large" };
  // validation?: { pattern: string };
};

// DB-level field definition — generic metadata record
export type FieldDefinition = {
  name: string;
  role: FieldRole;
  metadata: FieldMetadata;
  order: number;
};

// Typed metadata accessors
export function getTtsConfig(field: FieldDefinition): { lang: string } | null {
  return field.metadata.tts ?? null;  // present = enabled
}

// Card rating during study
export const CARD_RATINGS = ["wrong", "hard", "good", "easy"] as const;
export type CardRating = (typeof CARD_RATINGS)[number];

// Session status
export const SESSION_STATUSES = ["in_progress", "completed", "abandoned"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];
```

**File: `src/lib/presets.ts`** — language-specific field presets (Chinese, Spanish, etc.) including default metadata for each role

### Step 4: Convex Schema
**File: `convex/schema.ts`**

Tables:
- `flashcardSets` — name, description, language, ownerId, shareToken, fieldDefinitions (array of objects), createdAt
- `flashcards` — setId, fields (`v.record(v.string(), v.string())`), order
- `studySessions` — setId, userId, frontFields[], backFields[], cardOrder (array of card IDs — the full sequence, shuffled or not), currentIndex (number — resume position), status ("in_progress" | "completed" | "abandoned"), startedAt, completedAt, overallScore
- `cardResults` — sessionId, cardId, rating, timestamp

Indexes:
- `flashcardSets`: by_owner (ownerId)
- `flashcards`: by_set (setId)
- `studySessions`: by_set_user (setId, userId)
- `cardResults`: by_session (sessionId)

### Step 5: Convex Functions
**Mutations & Queries organized by domain:**

- `convex/flashcardSets.ts` — CRUD for sets (create, list, get, update, delete)
- `convex/flashcards.ts` — CRUD for cards within a set (create, batchCreate for CSV import, list, update, delete)
- `convex/studySessions.ts` — start session, record card result, complete session
- `convex/csvImport.ts` — parse CSV, infer field definitions, create set + cards in a batch

### Step 6: CSV Import Logic
**File: `src/lib/csvParser.ts`** — client-side CSV parsing

- Use `papaparse` library for robust CSV parsing
- Infer field definitions from headers (first row)
- Return parsed cards + inferred field definitions
- Validation: check for empty rows, missing required fields

### Step 7: TTS Utility
**File: `src/lib/tts.ts`**

- Wrapper around Web Speech API (`speechSynthesis`)
- `speak(text: string, lang: string)` — plays TTS for given text
- `getAvailableVoices(lang: string)` — lists available voices for a language
- Handle edge cases: voices loading async, browser support detection
- TTS config is derived from field `metadata` via `getTtsConfig()` in `types.ts` — **not stored as a dedicated DB column**

### Step 8: Pages & Components

**App structure** (Next.js App Router):
```
src/app/
  layout.tsx          — ClerkProvider + ConvexProvider
  page.tsx            — Landing/dashboard (list of sets)
  sets/
    new/page.tsx      — Create new set (manual or CSV import)
    [setId]/
      page.tsx        — Set detail (view cards, edit, start study)
      edit/page.tsx   — Edit set & cards
  study/
    [setId]/
      page.tsx        — Configure session (pick front/back fields)
      session/page.tsx — Active study session
      results/page.tsx — Session results/summary
```

**Key components:**
```
src/components/
  FlashcardSetList.tsx    — Grid/list of user's sets
  FlashcardSetForm.tsx    — Create/edit set (name, description, language, field defs)
  CardForm.tsx            — Add/edit individual card
  CsvImporter.tsx         — File upload + preview + field mapping
  StudyCard.tsx           — The flashcard component (front/back, flip animation)
  StudySessionConfig.tsx  — Pick which fields are front vs back
  CardRatingButtons.tsx   — Wrong/Hard/Good/Easy buttons
  SessionSummary.tsx      — End-of-session score breakdown
  TtsButton.tsx           — Speaker icon that plays TTS
  FieldDefinitionEditor.tsx — Add/remove/reorder field definitions
```

### Step 9: Study Session Flow

**Session as a persistent state machine** — supports resume on same device, cross-device (via Convex sync), and records the exact card order.

1. User navigates to a set → clicks "Study"
2. **Config screen**: pick which fields are front (shown) vs back (hidden), toggle shuffle
3. **Session starts**: a `studySession` record is created in Convex with:
   - `cardOrder`: full list of card IDs (shuffled or sequential based on config)
   - `currentIndex: 0`
   - `status: "in_progress"`
4. **Session screen**: cards shown one at a time based on `cardOrder[currentIndex]`
   - Front fields displayed, back fields hidden
   - TTS button plays fields with TTS enabled (derived from metadata)
   - User flips card to reveal back fields
   - User rates: Wrong / Hard / Good / Easy → `cardResult` written, `currentIndex` incremented
   - If user leaves mid-session → session stays `in_progress`, resumable
5. **Resume**: on returning (same or different device), user sees "Resume session?" prompt
   - Loads session at `currentIndex`, continues from where they left off
6. **Results screen**: when all cards done, `status` → `completed`, show summary

---

## File Tree (Final MVP)

```
flashcard-app/
  CLAUDE.md
  PROGRESS.md
  convex/
    CLAUDE.md
    schema.ts
    auth.config.ts
    flashcardSets.ts
    flashcards.ts
    studySessions.ts
  src/
    CLAUDE.md
    app/
      layout.tsx
      page.tsx
      sets/new/page.tsx
      sets/[setId]/page.tsx
      sets/[setId]/edit/page.tsx
      study/[setId]/page.tsx
      study/[setId]/session/page.tsx
      study/[setId]/results/page.tsx
    components/
      ConvexClientProvider.tsx
      FlashcardSetList.tsx
      FlashcardSetForm.tsx
      CardForm.tsx
      CsvImporter.tsx
      StudyCard.tsx
      StudySessionConfig.tsx
      CardRatingButtons.tsx
      SessionSummary.tsx
      TtsButton.tsx
      FieldDefinitionEditor.tsx
    lib/
      types.ts
      presets.ts
      csvParser.ts
      tts.ts
```

## Execution Order

1. Scaffold project + clean boilerplate
2. CLAUDE.md files + PROGRESS.md (references this plan at `~/.claude/plans/sunny-dancing-fern.md`)
3. Shared types (`types.ts`, `presets.ts`)
4. Convex schema + basic CRUD functions
5. Provider setup (Clerk + Convex — mostly from template)
6. Dashboard page (list sets)
7. Create set page (manual + field definition editor)
8. Set detail page (view/edit cards, add cards manually)
9. CSV import (parser + importer component)
10. Study session config page
11. Study session page (card flip, rating, TTS)
12. Results page

## Verification

- `pnpm dev` — app runs without errors
- Create a Chinese flashcard set manually with 3 fields (Character, Pinyin, Meaning)
- Add cards manually
- Import cards via CSV
- Start a study session, configure front/back fields, toggle shuffle
- Flip through cards, rate each one, hear TTS
- View session results

## Deferred to Phase 2

- **Telemetry / analytics** — add observability for error tracking and usage insights (not needed until there are users)
- **PWA manifest + offline support**
- **Sharing via link**
- **Progress dashboard**

## Claude Code Configuration Notes

### Permissions to consider (settings.json)
- Allow `pnpm` commands (install, dev, build, add)
- Allow `pnpx convex` commands (dev, deploy)
- Allow `pnpx create-next-app` / `pnpm create convex` for scaffolding

### Hooks to consider
- **Pre-commit / post-file-write**: auto-run `prettier --write` or `eslint --fix` on modified files. The Next.js template comes with ESLint config — could wire a hook to auto-format after edits.
- **Post-tool-call (Bash)**: could validate that `convex dev` is running in background when making schema changes, to catch type errors immediately.

### Skills
- `/simplify` — run after writing code to check for reuse opportunities and quality
- `/commit` — for committing changes with proper messages
- `/learn` — run after session to analyze and suggest Claude Code setup improvements

### Global preferences (already set)
- `pnpm` as package manager (in `~/.claude/CLAUDE.md`)

### Project-level CLAUDE.md should include
- `pnpm dev` starts both Next.js and Convex dev server (or if they need separate terminals)
- Convex schema changes require `convex dev` running to pick up types
- Component naming conventions (PascalCase, `.tsx` extension)
- Import alias `@/` maps to `src/`
- All Convex functions must check auth via `ctx.auth.getUserIdentity()`
- `FieldRole` and `FieldMetadata` types are the single source of truth in `src/lib/types.ts`
