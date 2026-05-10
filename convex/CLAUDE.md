# Convex Backend

## Gotchas
- Clerk JWT issuer domain must be set in the Convex Dashboard environment variables, not in `.env.local` — getting this wrong silently breaks auth
