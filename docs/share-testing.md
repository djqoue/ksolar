# Share For Testing

## Recommendation

Use a hosted preview link instead of sending a zip package.

For this project, the best default is Vercel preview deployment because:
- the app is already a standard Next.js project
- preview URLs are easy to share with sales and ops colleagues
- environment variables are managed outside the repo
- rollback is simple if a bad test build goes out

## Share Modes

### Mode A: Best for non-technical colleagues

Deploy to Vercel and send a URL.

Who it fits:
- sales
- ops
- management
- field testers

Pros:
- no install required
- always the same environment
- easy to collect feedback from one shared URL

Cons:
- needs GitHub plus one deployment setup
- browser key restrictions must be configured correctly

### Mode B: Best for technical teammates

Share the repo and let them run locally.

Steps:
1. Copy `.env.local.example` to `.env.local`
2. Fill in the required keys
3. Run `npm install`
4. Run `npm run dev`

Pros:
- easy for engineers
- good for debugging

Cons:
- not good for business-side testers
- each machine may behave differently

### Mode C: Fast in-office demo

Run locally on your machine and expose it to the same Wi-Fi network.

Pros:
- almost no setup
- useful for quick live review

Cons:
- unreliable for repeat testing
- your laptop becomes the server

## Google Key Setup

### Browser key

Used by:
- Maps JavaScript API
- Places / address search if enabled through the map client libraries

Rules:
- keep it in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- restrict by HTTP referrer
- restrict by API list

### Solar key

Used by:
- `/api/solar/building-insights`

Rules:
- keep it in `GOOGLE_SOLAR_API_KEY`
- do not expose it to the browser
- restrict it to Solar API only
- prefer a separate key from the browser-side map key

## Recommended Release Flow

1. Keep `main` as the stable internal test branch.
2. Use feature branches for ongoing UI and calc changes.
3. Let Vercel create preview links for feature review.
4. Promote only the validated build to the stable shared link.

## What To Tell Testers

Ask them to verify:
- can they search an address
- can they draw a roof area without confusion
- do Google Solar overlays align with the visible roof
- does the recommended system size feel realistic
- is the BOM readable
- is the ROI summary understandable in under 30 seconds

## Good Default For KSolar Right Now

At the current stage, use:
- one hosted preview link for business testers
- local development only for engineering work

That gives the least friction and the cleanest feedback loop.
