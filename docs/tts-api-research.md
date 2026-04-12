# TTS API Research (April 2026)

## Current: Web Speech API
- Free, built-in, no setup
- Quality varies by browser/OS — robotic on Firefox, better on Chrome (uses Google voices)
- Rate set to 0.75x for learner-friendly pace
- Chinese voices expect hanzi (characters), not pinyin

## Alternatives Investigated

| Provider | Chinese | Free Tier | Paid Cost | Quality | Notes |
|----------|---------|-----------|-----------|---------|-------|
| Google Cloud TTS | Yes | 1M chars/month | $16/1M chars | Neural, natural | Best free tier for flashcard usage (~100K plays/month free) |
| Amazon Polly | Yes | 5M chars/year (first year) | $16/1M chars | Neural, natural | Generous first-year free tier |
| Microsoft Azure | Yes | 500K chars/month | Varies | Very natural, many Chinese voices | Good voice variety |
| OpenAI TTS | Yes | $5 free credit (no card) | $15/1M chars | Very natural, 13 voices | Simple API, good docs |
| ElevenLabs | Yes | ~10K chars/month | $0.30/1K chars | Most natural | Expensive, low free tier |
| MiniMax | Yes (strong Mandarin/Cantonese) | None listed | $50/1M chars | Good | Long-text mode up to 200K chars |

## Implementation Requirements

All external TTS APIs require a backend proxy because:
1. **CORS** — TTS APIs don't allow direct browser requests
2. **Key security** — API keys can't be exposed client-side

### Proposed architecture (if implemented)
1. User provides their own API key in settings
2. Key stored in Convex (per user, encrypted at rest)
3. TTS button calls a Convex action → action calls TTS API → returns audio blob
4. Client plays the audio via `Audio` element
5. Cache audio in Convex file storage to avoid re-calling for the same text+lang

### Decision
- Web Speech API remains the default (zero config, free forever)
- **Chrome's Web Speech API is significantly better than Firefox** — the quality difference is night and day. Most TTS quality complaints may be browser-specific rather than API-level
- External TTS is a worst-case fallback, purely opt-in when user provides their key
- Very low priority — only revisit if quality is still a problem on Chrome

## Sources
- [Best TTS APIs in 2026 - Speechmatics](https://www.speechmatics.com/company/articles-and-news/best-tts-apis-in-2025-top-12-text-to-speech-services-for-developers)
- [OpenAI TTS Pricing](https://costgoat.com/pricing/openai-tts)
- [OpenAI TTS Docs](https://developers.openai.com/api/docs/guides/text-to-speech)
