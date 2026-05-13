# Decision: Support Both Focus Study and SRS

> Status: Accepted
> Last reviewed: 2026-05-12

## Decision

The app has two study modes:

- Focus Study: user chooses one set and studies it on demand.
- SRS Queue: app schedules due cards across SRS-enabled sets for daily review.

## Why

These modes solve different needs. Focus Study is for intentional drilling or learning a new set. SRS is for long-term retention and daily habit formation.

## Tradeoffs

- More UI and backend complexity.
- Two sources of review data: `cardResults` for Focus Study and `srsReviews` for SRS.
- Progress features must combine or distinguish both activity types.

## Related Files

- `convex/studySessions.ts`
- `convex/srs.ts`
- `convex/srsEngine.ts`
- `convex/srsReviewQueue.ts`
- `src/app/study/`
- `src/app/srs/`
