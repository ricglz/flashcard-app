# AI-Powered Card Suggestions

> Date: 2026-04-27
> Status: Design

## Goal

Use an LLM to analyze a user's study performance and suggest new flashcards that target their weak areas. The AI sees what the user struggles with (low ease factors, frequent "wrong"/"hard" ratings, cards stuck in "learning" status) and generates cards that reinforce those gaps — related vocabulary, alternative phrasings, component breakdowns, etc.

This is distinct from the existing "AI card generation from prompts" idea (Phase 4 in product-decisions.md), which is user-directed ("generate cards about X"). This feature is **data-driven** — the AI decides what the user needs based on performance signals.

## BYOK Model

Follows the established bring-your-own-key approach from product-decisions.md:
- User provides their own LLM API key (initially Claude/Anthropic, potentially OpenAI later)
- Keys stored per-user in Convex (encrypted at rest by Convex)
- No API costs for the platform

## How It Works

### 1. Gather Performance Context

A Convex action collects the user's study data for a given set (or across all sets):

**Weak card signals** (from `srsCards`):
- Cards with low `easeFactor` (< 2.0 = consistently difficult)
- Cards with `status: "learning"` (haven't graduated to stable review)
- Cards with high `repetitions` but still-low ease (memorized but fragile)

**Review history patterns** (from `srsReviews`):
- Cards with high "wrong"/"hard" ratio over recent reviews
- Cards where `easeFactor` is trending downward across reviews
- Recent review timestamps to focus on currently active struggles, not old resolved ones

**Card content** (from `flashcards` + `flashcardSets.fieldDefinitions`):
- The actual field values of weak cards (e.g., Character: 说, Pinyin: shuō, Meaning: to speak)
- Field definitions so the AI knows the set's structure

**Strong card signals** (for contrast):
- Cards with high ease factors and "review" status — the AI can see what the user already knows to avoid generating duplicates and to understand the user's level

### 2. Build the Prompt

The Convex action constructs a prompt with:

```
System: You are a flashcard tutor for [set field structure]. The user is studying
[field definitions context]. Based on their performance data, suggest new cards
that would strengthen their understanding of weak areas.

User context:
- Weak cards (struggling): [list with field values + performance metrics]
- Strong cards (mastered): [sample for level context]
- Set field structure: [field definitions with roles]

Generate [N] new cards as JSON matching the field structure.
For each card, briefly explain why it helps (which weak area it targets).
```

Key prompt design considerations:
- Include field definitions so generated cards match the set's structure exactly
- Show weak cards WITH their ratings/ease so the AI understands severity
- Include some mastered cards so the AI calibrates difficulty level
- For Chinese: the AI should suggest related characters (same radical, similar tone), phrases using struggled characters, or simpler breakdowns
- Cap context size — don't send thousands of cards. Prioritize the ~20 weakest + ~10 strongest for level calibration

### 3. Present Suggestions

The AI returns structured card suggestions. The user sees:
- A list of suggested cards with a brief rationale per card ("targets your difficulty with 3rd tone characters")
- Checkboxes to accept/reject individual suggestions
- Inline editing before accepting (LLMs make mistakes, especially with tones)
- "Add selected to set" button that creates the cards via the existing `flashcards.create` mutation

### 4. Cards Enter the SRS Pipeline

Accepted cards are added to the set normally. Since the set is SRS-enabled, the daily cron picks them up as `status: "new"` srsCards and feeds them into the review queue.

## UX Flow

### Entry Point
- **Set detail page**: "Suggest cards" button (only visible if the user has an API key configured and the set has SRS review history)
- **SRS completion screen**: After finishing daily reviews, offer "Want AI suggestions based on today's session?" as a secondary action

### Suggestion Screen (`/sets/[id]/suggestions`)
1. Loading state: "Analyzing your study patterns..."
2. Results: card list with rationale, checkboxes, inline edit
3. Actions: "Add selected" / "Regenerate" / "Cancel"
4. Confirmation: "Added X cards to [set name]"

### Settings
- API key configuration: Settings page or modal, stored per-user
- Model selection (optional, future): let user pick Claude Sonnet vs Opus vs other providers
- Suggestion count: default 10, configurable 5-20

## Technical Implementation

### Schema Changes

**New table — `userSettings`:**

Per-user application settings, starting with AI configuration. This is a general-purpose settings table, not AI-specific.

```
userSettings: {
  userId:       string          // Clerk user ID
  aiProvider:   string          // "anthropic" | "openai" (start with anthropic only)
  aiApiKey:     string          // encrypted API key
  aiModel:      optional string // model override, defaults to provider's recommended
  createdAt:    number
  updatedAt:    number
}
// Indexes:
//   by_userId: [userId]  — one row per user
```

**New table — `suggestionBatches`:**

Tracks each AI suggestion request for history/debugging.

```
suggestionBatches: {
  userId:       string
  setId:        Id<"flashcardSets">
  status:       "pending" | "completed" | "failed"
  suggestedCards: array of {
    fields:     record<string, string>   // same shape as flashcards.fields
    rationale:  string                    // why this card was suggested
    accepted:   boolean                  // user's decision
  }
  weakCardIds:  array of Id<"flashcards"> // which cards triggered the suggestions
  promptTokens: optional number          // for cost tracking
  completionTokens: optional number
  error:        optional string          // if status is "failed"
  createdAt:    number
}
// Indexes:
//   by_userId_setId: [userId, setId]  — suggestion history per set
```

### Convex Functions

**`convex/aiSuggestions.ts`:**

1. **`generateSuggestions`** (action — actions can call external APIs):
   - Input: `setId`, `count` (default 10)
   - Reads user's API key from `userSettings`
   - Gathers performance data (weak cards, strong cards, field definitions)
   - Calls LLM API with constructed prompt
   - Parses response, validates card structure matches field definitions
   - Stores result in `suggestionBatches`
   - Returns suggested cards

2. **`acceptSuggestions`** (mutation):
   - Input: `batchId`, `acceptedIndices` (which suggestions to keep), `edits` (any field modifications)
   - Creates flashcard rows for accepted suggestions
   - Updates `suggestionBatches` to mark accepted/rejected
   - If set is SRS-enabled, `srsCards` rows are created by the existing enrollment flow

3. **`getUserSettings`** (query) / **`saveUserSettings`** (mutation):
   - CRUD for the `userSettings` table
   - API key is write-only from the client perspective — queries return a masked version

### Data Size Budgeting

LLM context is expensive and has limits. Budget the performance context:

| Data | Max items | Estimated tokens |
|------|-----------|-----------------|
| Weak cards (fields + metrics) | 20 | ~1,500 |
| Strong cards (fields only) | 10 | ~400 |
| Field definitions | All | ~100 |
| System prompt | 1 | ~300 |
| **Total input** | | **~2,300** |
| Generated cards (10 × fields + rationale) | 10 | ~1,000 |

Well within context limits for any modern LLM. For users with many weak cards, prioritize by lowest ease factor.

### API Key Security

- Keys stored in Convex (encrypted at rest)
- Never returned to the client in full — queries return masked version (e.g., `sk-...xyz`)
- Only used server-side in Convex actions
- User can delete/rotate their key at any time

## Scope & Phasing

### Phase A — Foundation
- `userSettings` table + settings UI for API key
- Core `generateSuggestions` action with Anthropic Claude support
- Suggestion review screen (view, edit, accept/reject)
- Entry point on set detail page

### Phase B — Polish
- SRS completion screen entry point ("suggest based on today's session")
- Cross-set suggestions ("suggest cards across all my sets")
- Suggestion history (past batches, what was accepted)
- Token usage tracking

### Phase C — Advanced
- Multiple AI providers (OpenAI, etc.)
- Custom system prompts per set ("focus on business vocabulary", "HSK level 3 only")
- Suggestion templates (user can guide the AI's approach)
- Auto-suggest: periodic suggestions after N reviews without prompting

## Open Questions

1. **Scope: per-set vs. cross-set?** Start with per-set (simpler context, cards match the set's field structure). Cross-set suggestions are harder because different sets may have different field definitions.

2. **Duplicate detection**: Should the AI check if a suggested card already exists in the set? We can include all existing card content in the prompt (for small sets) or do a post-generation dedup check. For large sets, post-generation fuzzy matching is more practical.

3. **Rate limiting**: Should we limit how often a user can request suggestions? Probably not initially — they're paying for their own API calls. But a cooldown could prevent accidental double-clicks.

4. **Feedback loop**: Should we track whether AI-suggested cards perform better/worse in SRS than manually created cards? Useful for tuning prompts but adds complexity. Defer to Phase C.
