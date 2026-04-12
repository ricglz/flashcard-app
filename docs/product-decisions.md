# Flashcard App - Product Decisions

> Project: `~/play-repos/flashcard-app`
> Date: 2026-04-01

## Vision

A flashcard app primarily for learning Chinese (pinyin, phonetics, and meaning), designed to be
more engaging than reading through static character lists. Local-first with cloud backup, starting
as a PWA and evolving into a mobile app via Expo React Native.

## Differentiation from Anki

Anki is the gold standard for spaced-repetition flashcards. This app occupies a different niche:

| Aspect | Anki | This App |
|--------|------|----------|
| Target audience | Power users, all subjects | Chinese learners first, then generalized |
| UX | Desktop-era UI, steep learning curve | Modern web/mobile-first, minimal friction |
| Data model | Fixed front/back with note types | Generic field-based (N fields per set, each with roles + metadata) |
| Study direction | Pre-configured note types & card templates | Per-session choice of which fields are front vs. back |
| TTS | Requires add-ons | Built-in, field-level TTS config via metadata |
| Chinese-specific UX | Via community add-ons | First-class (tone-aware rendering, pinyin display, Chinese TTS voices) |
| Sharing | Export/import .apkg files | Link-based sharing, no file management |
| Platform | Desktop app + AnkiWeb + AnkiDroid (separate codebases) | Single PWA → Expo native, one codebase |
| Sync | AnkiWeb (manual sync button) | Real-time via Convex, automatic cross-device resume |
| AI generation | None (community add-ons only) | Planned: LLM-powered card generation from a prompt |
| Spaced repetition | Core feature (SM-2) | Planned for Phase 2, not the sole focus |

**Positioning**: Anki's flexibility with Duolingo's approachability, Chinese-first.

## Core Features

### 1. Flashcard Sets
- Users can **create sets manually** (add cards one by one) and **import** (CSV initially, other formats later)
- Each set defines its own **field definitions** — not hardcoded to character/pinyin/meaning
- Chinese sets will typically have: Character, Pinyin, Meaning — but any subject/language can define custom fields
- See Data Model section for the abstract field-based structure

### Set Creation Wizard (Planned — replaces current form)
The current set creation page front-loads field definition configuration, which is abstract and confusing for new users. Replace with a step-by-step wizard where the data drives the structure:

**Step 1 — Name & source method**
- User enters set name + optional description
- Chooses how to add cards: **Import CSV** or **Add manually**

**Step 2 — Add cards**
- *CSV path*: upload file → cards and field names are inferred from headers
- *Manual path*: spreadsheet-like UI where user adds rows and names columns

**Step 3 — Configure field metadata**
- Shows a **card preview** alongside the field configuration
- For each field, user sets: **role** (primary / pronunciation / definition / note) and **TTS** (on/off + language code)
- Heuristics can suggest defaults (e.g., a column named "Pinyin" → role: pronunciation, TTS: zh-CN) but user always confirms
- This step applies to both CSV and manual paths — every set goes through metadata configuration

**Step 4 — Review & create**
- Final preview of cards with field roles and TTS applied
- Create set

This replaces language presets — the preset concept becomes unnecessary because field metadata is configured after the user sees their actual data. Language-specific templates could still be offered as optional starting points in Step 2 (manual path) but are not required.

### 2. Study Sessions
- **Configurable study direction per session** — user chooses which fields are shown (front) vs. hidden (back)
- Field roles determine what's available for each direction:
  - e.g., show "Pinyin" -> recall "Meaning"
  - e.g., show "Meaning" -> recall "Pinyin" + "Character"
- User's personal priority: learn pinyin, phonetics, and meaning first; character recognition secondary
- **Configurable session size** — user can choose how many cards to include in a scored session (e.g., 20 out of 100). Large sets are overwhelming when most cards are unfamiliar; smaller sessions reduce cognitive load.

### 2b. Browse / Practice Mode (Planned)
- A **no-scoring study mode** for freely cycling through cards without spaced repetition tracking
- **Free navigation** — user can go back and forth between cards, not just forward
- **Dismiss/hide cards** — user can remove cards they already know from the current browse session, narrowing the deck as they go
- Purpose: casual review and familiarization before committing to scored study sessions
- Lives alongside scored sessions on the study config page as an alternative mode

### 3. Text-to-Speech
- Web Speech API for pronunciation playback (default, no setup required)
- TTS voices expect native script (hanzi for Chinese, kanji/kana for Japanese) — pinyin romanization produces garbled output
- Plays audio on demand during card review, auto-plays on reveal with mute/unmute toggle
- **Open question**: TTS is currently on the Character field, but the user's study flow is pinyin-oriented. Hearing pronunciation on the character side may feel disconnected. Possible solutions: TTS on both fields, or an external TTS API that handles pinyin.
- **Optional high-quality TTS (nice to have)**: Users can provide their own API key (Google Cloud TTS, OpenAI TTS, etc.) for natural-sounding voices. Purely opt-in — Web Speech API remains the default. Requires: user key storage in Convex, Convex action to proxy TTS API calls, audio caching to avoid redundant API calls for the same text. See `docs/tts-api-research.md` for detailed comparison and architecture.

### 4. Scoring
- **Per-card self-rating** during the session (Wrong / Hard / Good / Easy)
- **Session summary** at the end with overall score
- Track progress over time per card and per set

### 5. Pronunciation Validation (Future)
- Validate user's pronunciation against expected pinyin
- Likely requires speech-to-text + comparison logic
- Deferred to post-MVP

### 6. Sharing
- All flashcard sets are **private by default**
- Users can share sets via link (not publicly discoverable)
- No public marketplace/library initially — integrity concerns noted
- Import from shared links requires explicit user action
- Note: even link-based sharing has potential integrity issues (anyone with link can import anything). Accept this risk for now, add moderation/flagging later if needed

### 7. AI Features — BYOK Model (Future)
All AI features follow a **bring-your-own-key** approach: the app provides the UI and orchestration, but users supply their own LLM API key. No API costs for the platform. Keys stored per-user in Convex.

**Card Generation**:
- User provides a **text prompt** describing what they want to learn (e.g., "50 most common Chinese food vocabulary", "HSK 2 verbs", "basic greetings in Mandarin")
- LLM generates cards matching the set's **field definitions** (e.g., Character/Pinyin/Meaning for Chinese)
- Generated cards are shown in a **review/edit screen** before saving — users must verify accuracy, especially for tonal languages where LLM mistakes are common
- Differentiator: Anki has no native AI generation — this is a unique value-add

**Weak Spot Analysis** (see Phase 4):
- AI analyzes performance data and suggests targeted card sets

**Customization**:
- Users may be able to customize the system prompt per feature (e.g., tone of generated content, difficulty level). Exact configurability TBD per feature.

### 8. Study Streaks & Gamification (Future)
- Daily study streak tracking — consecutive days with at least one completed session
- Visual streak indicator on the dashboard (fire icon, counter)
- Optional daily goal (e.g., "review 20 cards/day") with progress ring
- Lightweight — no leaderboards or social pressure, just personal motivation
- Inspired by Duolingo's streak mechanic but without the guilt-trip notifications

### 9. Card Annotations / Notes (Future)
- Users can attach **personal notes** to individual cards (mnemonics, example sentences, memory aids)
- Notes are per-user, not per-card — if a shared set is imported, each user's notes are private
- Displayed below the card during review (toggle-able)
- Useful for Chinese: users often have personal mnemonics for characters

### 10. Multi-Modal Cards (Future)
- Support **images** as field values (e.g., a picture of the character's stroke order, a photo for visual vocabulary)
- Support **audio clips** as field values (recorded pronunciation, not just TTS)
- Stored via Convex file storage
- Enables use cases beyond text: visual learners, medical/anatomy flashcards, art history

## Technical Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Web Framework | **Next.js** | SSR, great PWA support, first-class Convex integration |
| Mobile (future) | **Expo React Native** | Cross-platform, code sharing with web |
| Backend/DB | **Convex** | Real-time sync, local-first friendly |
| Auth | **Clerk** | Social login (Google/Apple), built-in Convex integration |
| TTS | **Web Speech API** | Free, built-in, Chinese voices available |
| Package Manager | **pnpm** | User preference |

## Data Model (High Level)

### Abstract Field-Based Design

The flashcard data model is **generic, not hardcoded to Chinese**. Each set defines its own fields,
making the same structure work for any language or subject.

### Field Definitions (per set)
Each flashcard set declares its fields with:
- **name** — display label (e.g., "Character", "Pinyin", "Meaning")
- **role** — semantic role used by the UI/TTS engine. **This enum must be maintained as a single source of truth in the codebase** (e.g., a shared `FieldRole` type/enum) so it's easy to find, extend, and validate against:
  - `primary` — the main content (e.g., character, word, term)
  - `pronunciation` — phonetic representation (e.g., pinyin, IPA)
  - `definition` — meaning or translation
  - `note` — optional extra info
- **ttsEnabled** — **NOT a dedicated DB field**. Instead, stored inside the generic `metadata` record. Code-level typed parsers (e.g., `getTtsConfig()`) extract TTS config from metadata, keeping the DB schema flexible while the code remains type-safe.
- **order** — display order within the card

Example for Chinese:
```
fieldDefinitions: [
  { name: "Character", role: "primary",       metadata: { ttsEnabled: false }, order: 0 },
  { name: "Pinyin",    role: "pronunciation", metadata: { ttsEnabled: true, ttsLang: "zh-CN" }, order: 1 },
  { name: "Meaning",   role: "definition",    metadata: {}, order: 2 },
]
```

Example for Spanish:
```
fieldDefinitions: [
  { name: "Spanish",     role: "primary",    metadata: { ttsEnabled: true, ttsLang: "es" }, order: 0 },
  { name: "English",     role: "definition", metadata: {}, order: 1 },
]
```

### Tables
- **users** — synced from Clerk
- **flashcardSets** — name, description, owner, shareToken, fieldDefinitions[], createdAt
- **flashcards** — setId, fields (key-value map matching fieldDefinitions), order
- **studySessions** — setId, userId, frontFields[], backFields[], cardOrder (array of card IDs), currentIndex (resume position), status ("in_progress" | "completed" | "abandoned"), startedAt, completedAt, overallScore
- **cardResults** — sessionId, cardId, rating (wrong/hard/good/easy), timestamp

### Study Direction
- When starting a session, user picks which fields are **front** (shown) vs. **back** (hidden/recalled)
- The set's field definitions determine the available choices
- TTS plays fields where `metadata.tts` is present and the field is on the **front** side (optionally on reveal too)

### Session as State Machine
- Sessions are **persistent and resumable** — stored in Convex, synced across devices
- `cardOrder` stores the full sequence of card IDs (shuffled or sequential), determined at session start
- `currentIndex` tracks progress — if user drops out, they resume from this position
- `status` tracks lifecycle: `in_progress` → `completed` (or `abandoned`)
- On returning to a set with an `in_progress` session, user is prompted to resume or start fresh

### CSV Import
- Column headers map to field definition names
- If importing into a new set, field definitions are inferred from CSV headers
- If importing into an existing set, columns must match existing field definitions

### Storage Strategy
- **Local-first**: data stored in browser (IndexedDB or similar) for offline use
- **Convex sync**: background sync to cloud when online
- **Conflict resolution**: last-write-wins for simplicity (Convex handles this)

## Architecture Approach
- **Chinese-first UX, generic data model** — field-based structure supports any subject/language, but the UI is optimized for Chinese (tone indicators, pinyin display, Chinese TTS voices)
- Language-specific UX enhancements (e.g., tone color coding) can be driven by field metadata (TTS lang, field roles)
- Generalization of UX (language-specific rendering plugins) deferred until there's demand

## Pending Decisions

### Language field removal
- The `language` field on `flashcardSets` should be **removed** — it's currently display-only and redundant with per-field TTS metadata
- TTS language is already stored in field-level `metadata.tts.lang`, which is the actual source of truth
- Any future language-specific UX (tone coloring, etc.) can be inferred from field metadata
- Requires: schema migration, removing from set creation/edit forms, removing from set list/detail display

### UI overhaul needed
- The current UI is functional but visually rough — needs a design pass
- No specific direction decided yet — open to exploring component libraries, design systems, or custom design
- Should be addressed before Phase 2 (Polish) but exact approach TBD

## Testing
- E2e tests for happy paths after initial implementation
- Focus on: creating a set, importing CSV, running a session, scoring

## Development Phases (Rough)

### Phase 1 — MVP (PWA)
- Project setup (Next.js + Convex + Clerk)
- Data model and local storage
- Create/manage flashcard sets manually
- CSV import
- Basic study session with configurable direction
- Per-card rating + session summary
- TTS playback
- Remove `language` field from schema and UI
- Set creation wizard (replaces current form)
- UI overhaul (approach TBD)

### Phase 2 — Polish
- PWA manifest + offline support
- Progress tracking dashboard
- Sharing via link
- Study streaks & daily goals

### Phase 3 — Mobile
- Expo React Native app
- Shared business logic with web
- Push notifications for study reminders

### Phase 4 — Advanced
- AI card generation from prompts
- Pronunciation validation
- Spaced repetition algorithm
- Card annotations / personal notes
- Multi-modal cards (images, audio clips)
- Multi-language UX enhancements
- **AI-powered weak spot analysis**: Analyze cards the user consistently gets wrong and suggest new card sets targeting those weak areas. For language learning: suggest phrases/topics containing difficult characters. For phrases: suggest a more focused card set drilling the specific patterns the user struggles with. May be most valuable for language learning use cases.
- **Related card sets**: Link a card set to related sets that broaden or deepen the same topic. Could be user-curated or AI-suggested based on content overlap.
- **Copy/import other users' card sets**: Users can browse shared sets and copy them into their own library. Distinct from the existing link-based sharing (which is view-only) — copying creates an independent clone the user can edit.
