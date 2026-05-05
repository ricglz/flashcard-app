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
| Spaced repetition | Core feature (SM-2) | Dual-mode: Focus Study (on-demand) + SRS Queue (daily reviews) |

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
- Heuristics can suggest defaults (e.g., a column named "Character" → role: primary, TTS: zh-CN; "Pinyin" → role: pronunciation) but user always confirms
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
- **Open question**: TTS is on the Character field (native script). The user's study flow is pinyin-oriented, so hearing pronunciation on the character side may feel disconnected. Possible solutions: TTS on both fields, or an external TTS API that handles pinyin.
- **Speed control (planned)**: Currently hardcoded to `0.75` rate in `src/lib/tts.ts`. Add a user-facing speed slider or preset buttons (0.5x / 0.75x / 1.0x) in the session header. The Web Speech API `SpeechSynthesisUtterance.rate` property already supports this — just needs UI and a persisted preference.
- **Per-character playback (planned)**: Tap an individual character during review to hear just that character spoken in isolation. Useful when a multi-character phrase is too fast or the user wants to focus on one syllable. The existing `speak()` function accepts any string, so this is a UI interaction change — add tap handlers on individual characters that call `speak(char, lang)`.
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

### 9. Card Flags & Annotations (Future)
- Users can **flag** individual cards as "difficult" or "needs attention" — a lightweight marker separate from SRS scoring
- Flags capture intent the algorithm can't infer (e.g., "got it right but was guessing", "ask teacher about this tone")
- Users can attach **personal notes** to individual cards (mnemonics, example sentences, memory aids)
- Notes are per-user, not per-card — if a shared set is imported, each user's notes are private
- Displayed below the card during review (toggle-able)
- Useful for Chinese: users often have personal mnemonics for characters

### 10. Difficult Cards View (Future)
A cross-set view that surfaces cards the user is struggling with, regardless of which set they belong to. Primary daily use case: review problem cards before a tutoring session, or re-study them in a focused batch.

**Data sources (layered):**
1. **SRS-derived** (automatic): Query `srsCards` for low ease factors (near the 1.3 minimum), high lapse counts, or `status: "learning"` with many repetitions. Zero user effort — surfaces what the algorithm already knows. Requires SRS to be deployed and cards to have review history.
2. **Focus Study history**: Query `cardResults` for cards rated "wrong" or "hard" across sessions. Requires joining through `studySessions` to get set context — less direct than SRS data but covers non-SRS study.
3. **Manual flags**: User-flagged cards (see Section 9). Captures struggles the algorithm misses.

**UX:**
- Top-level page (e.g., `/difficult`) accessible from the dashboard — not scoped to a single set
- Cards grouped by set, each showing the card content + reason it's surfaced (low ease, flagged, recent "wrong" ratings)
- Actions: re-study as a batch (ad-hoc session from the filtered cards), unflag, add/edit notes
- Filter/sort by: source (SRS / flags / focus study), set, date last reviewed

**Implementation note:** Start with SRS data after deploy (simplest query, best signal). Layer in flags and focus study history as follow-ups.

### 11. Multi-Modal Cards (Future)
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
  { name: "Character", role: "primary",       metadata: { tts: { lang: "zh-CN" } }, order: 0 },
  { name: "Pinyin",    role: "pronunciation", metadata: {}, order: 1 },
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
- **Cloud-first with offline cache**: Convex is the source of truth, with IndexedDB as a local read cache and offline write queue
- **Offline support**: Service worker (Serwist) caches app shell; IndexedDB mirrors query data for offline reads; mutations queue locally and sync on reconnect
- **Conflict resolution**: server wins on sync — local cache refreshed from Convex after outbox drain
- See `docs/offline-strategy.md` for full research, alternatives explored, and implementation plan

## Architecture Approach
- **Chinese-first UX, generic data model** — field-based structure supports any subject/language, but the UI is optimized for Chinese (tone indicators, pinyin display, Chinese TTS voices)
- Language-specific UX enhancements (e.g., tone color coding) can be driven by field metadata (TTS lang, field roles)
- Generalization of UX (language-specific rendering plugins) deferred until there's demand

## Two Study Modes

The app has two distinct study workstreams, each with its own purpose and UI:

### Focus Study (existing)
On-demand, set-based study — the current flow. User picks a set, configures front/back fields, studies a session of N cards, gets a score. No scheduling, no queue. Use case: "I want to drill this specific set right now."

No changes needed to the existing implementation.

### SRS Queue (new — Anki-inspired spaced repetition)

A daily review queue powered by spaced repetition. Cards from SRS-enabled sets are scheduled for review based on past performance. The user opens the queue, reviews what's due today, and the algorithm schedules the next review.

#### How it works

1. **Enrollment**: When a user adds a set to their library, they can enable/disable SRS for it (default: on). This is stored on the `userSets` link table, not on the set itself — so linking another user's set in the future works naturally.

2. **Daily cron job**: A scheduled Convex cron runs daily and populates the `reviewQueue` table. It checks each user's `srsCards` for cards where `nextReviewAt <= now`, plus picks new cards (never reviewed) up to the daily limit (default: 20). All eligible cards are shuffled together across sets, then inserted into the queue.

3. **Review flow**: User opens the queue and sees their cards for the day ("12 of 30 done"). After revealing the answer, they rate recall: **Again** / **Hard** / **Good** / **Easy**. This matches the existing `cardResults` rating scale.

4. **On review completion**: The SM-2 algorithm updates the card's scheduling state in `srsCards` (new interval, ease factor, `nextReviewAt`). A review log entry is created in `srsReviews`. The card is **removed from `reviewQueue`**.

5. **Cross-set queue**: The queue pulls from ALL SRS-enabled sets for the user, shuffled together. The user doesn't pick a set — they just "do their daily reviews."

6. **Study direction**: Each user defines default front/back fields per set (stored on `userSets`). During SRS review, the card is shown using its set's configured defaults.

#### SRS algorithm (SM-2)

The classic SM-2 algorithm, same foundation as Anki:

- **ease_factor**: starts at 2.5, adjusted per review (min 1.3)
- **interval**: first review = 1 day, second = 6 days, then `interval × ease_factor`
- **Again** resets interval to 1 day and decreases ease
- **Hard** slightly increases interval, slightly decreases ease
- **Good** applies the standard interval formula
- **Easy** applies a bonus multiplier and increases ease

#### Schema changes

**New table — `userSets`:**

Per-user link to a set. Replaces the implicit "you own it" relationship and supports future set-sharing. Controls SRS enrollment and study direction defaults.

```
userSets: {
  userId:           string              // Clerk user ID
  setId:            Id<"flashcardSets">
  srsEnabled:       boolean             // default: true — whether this set feeds the SRS queue
  defaultFrontFields: string[]          // field names shown during SRS review
  defaultBackFields:  string[]          // field names hidden during SRS review
  createdAt:        number
}
// Indexes:
//   by_userId: [userId]                — all sets in a user's library
//   by_userId_setId: [userId, setId]   — lookup for a specific user+set
//   by_setId: [setId]                  — all users linked to a set
```

**New table — `srsCards`:**

Per-user, per-card SRS scheduling state. Created when a card's set is SRS-enrolled by the user.

```
srsCards: {
  userId:         string              // Clerk user ID
  cardId:         Id<"flashcards">
  setId:          Id<"flashcardSets"> // denormalized for efficient per-set queries
  easeFactor:     number              // starts at 2.5
  interval:       number              // days until next review
  repetitions:    number              // consecutive successful reviews (reset on "Again")
  nextReviewAt:   number              // timestamp — when this card is next due
  lastReviewedAt: optional number     // timestamp of most recent review
  status:         "new" | "learning" | "review"  // Anki-style card states
}
// Indexes:
//   by_userId_nextReview: [userId, nextReviewAt]  — cron uses this to find due cards
//   by_userId_setId: [userId, setId]              — per-set management
//   by_cardId_userId: [cardId, userId]            — lookup for a specific card+user
```

**New table — `reviewQueue`:**

The daily to-do list. Populated by the cron job, drained as the user reviews cards.

```
reviewQueue: {
  userId:    string              // Clerk user ID
  cardId:    Id<"flashcards">
  srsCardId: Id<"srsCards">     // link back to scheduling state
  setId:     Id<"flashcardSets"> // denormalized for UI (field definitions lookup)
  queuedAt:  number              // timestamp when cron added this
  order:     number              // shuffled position within the day's queue
}
// Indexes:
//   by_userId_order: [userId, order]  — fetch today's queue in order
//   by_srsCardId: [srsCardId]         — lookup/delete after review
```

**New table — `srsReviews`:**

Immutable log of every SRS review event. Separate from `cardResults` because SRS reviews are not tied to a study session — they're standalone.

```
srsReviews: {
  userId:        string
  cardId:        Id<"flashcards">
  srsCardId:     Id<"srsCards">
  rating:        "wrong" | "hard" | "good" | "easy"  // reuses existing rating type
  timestamp:     number
  // snapshot of scheduling state AFTER this review (useful for debugging/analytics)
  newInterval:   number
  newEaseFactor: number
}
// Indexes:
//   by_srsCardId: [srsCardId]  — review history for a card
//   by_userId:    [userId]     — user's review history
```

#### Card lifecycle

```
User adds set to library (userSets, srsEnabled: true)
                     ↓
      srsCards rows created for each card (status: "new")
                     ↓
      Daily cron runs → finds due cards + new cards (up to limit)
                     ↓
      Shuffles all eligible cards → inserts into reviewQueue
                     ↓
              User reviews card from queue
                     ↓
         SM-2 computes next interval
                     ↓
     srsCards updated (nextReviewAt, interval, easeFactor)
     srsReviews row created (immutable log)
     reviewQueue row deleted
                     ↓
        Card re-enters queue on a future day via cron
```

#### UX considerations

- **Dashboard**: Show "X cards due today" prominently — this is the primary daily action
- **Daily progress**: "12 of 30 reviewed" — the queue table makes this trivial to compute
- **Mixed sets in queue**: Cards from different sets may have different field structures. The review UI adapts per card based on its set's field definitions and the user's configured front/back defaults
- **Undo**: Allow undoing the last rating (important for misclicks). Revert the `srsCards` state, delete the `srsReviews` row, re-insert the `reviewQueue` row

#### Resolved decisions

- **Cron timing**: Fixed UTC schedule (no per-user timezone logic). Simple and predictable.
- **Leftover queue items**: Carry over — unfinished cards stay in the queue until reviewed. The cron only adds newly due cards and new cards, it doesn't clear old ones.
- **New card limit scope**: 20 new cards/day global across all sets. The cron picks from all SRS-enabled sets combined, not 20 per set.

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
- Spaced repetition — SRS Queue (see "Two Study Modes" section above)
- Card flags & annotations (see Section 9)
- Difficult cards cross-set view (see Section 10)
- Multi-modal cards (images, audio clips)
- Multi-language UX enhancements
- **AI-powered weak spot analysis**: Analyze cards the user consistently gets wrong and suggest new cards targeting those weak areas. Uses SRS performance data (ease factors, review history, card status) to identify struggles, then sends context to an LLM to generate targeted cards. See `docs/ai-card-suggestions.md` for full design.
- **Related card sets**: Link a card set to related sets that broaden or deepen the same topic. Could be user-curated or AI-suggested based on content overlap.
- **Copy/import other users' card sets**: Users can browse shared sets and copy them into their own library. Distinct from the existing link-based sharing (which is view-only) — copying creates an independent clone the user can edit.
- **Cross-field word alignment (exploratory)**: Map individual tokens across fields (e.g., 你 ↔ nǐ ↔ you) with UI highlighting. Useful for language learning but complex — word boundaries differ across languages, pinyin syllables don't always map 1:1 to meaning words, and sentence-level alignment is a hard problem. Could be manual (user/program defines mappings) or AI-assisted. Needs research before committing.
