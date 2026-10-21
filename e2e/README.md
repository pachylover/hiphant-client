# Highlight browse E2E

Install the frontend dependencies in the repository root first. Then:

```sh
cd e2e
npm ci
npx playwright install chromium
npm test
```

The suite builds the frontend and starts it on port 3102 with an isolated fixture
API on port 18082. No application database or CHZZK API is used. Stop other Next.js
builds before running the suite because it uses the repository's `.next` directory.

Covers the existing homepage layout, streamer search placement and results,
highlight pagination, empty/error states, mobile navigation, and page metadata.
Delayed-response cases verify navigation overlays, empty-query resubmission,
video loading failures, and the 15-second highlight-list request timeout.
