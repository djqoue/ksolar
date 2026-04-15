# KSolar MVP

KSolar is a Next.js rooftop solar quotation MVP for the Thailand market.

The app is designed for fast field quoting:
- draw or select a roof on Google Maps
- estimate usable area and system size
- compare Google Solar guidance with KSolar sellable system logic
- generate BOM, pricing, and ROI outputs from code-side rules

## Local Development

Requirements:
- Node.js 20+
- npm 10+

Setup:

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_maps_key
GOOGLE_SOLAR_API_KEY=your_server_side_solar_key
```

Notes:
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is used in the browser for the map UI.
- `GOOGLE_SOLAR_API_KEY` is used only by the server route at `/api/solar/building-insights`.
- Do not commit real keys into Git.

## Best Way To Share With Teammates

The recommended path for internal testing is a Vercel preview deployment.

Why this is the best fit:
- Next.js is supported with zero-config deployment on Vercel.
- Every push can create a fresh preview URL for QA.
- You can keep Google Solar on the server side with environment variables.
- Teammates only need a link, no local setup.

Recommended workflow:
1. Push the project to GitHub.
2. Import the repo into Vercel.
3. Add the two environment variables in the Vercel project settings.
4. Create one stable test deployment for colleagues.
5. Restrict the Google Maps browser key to your Vercel domains.

Suggested domain allowlist examples for the browser key:
- `https://your-project.vercel.app/*`
- `https://your-branch-slug-your-project.vercel.app/*`
- any custom internal test domain you attach later

For the Solar key:
- keep it server-side only
- restrict it to the Solar API
- if possible, place it in a separate Google Cloud project from the browser key

## Alternative Sharing Options

If you do not want to deploy yet, there are two backup options:

1. Local LAN demo
- Run `npm run dev`
- Share your laptop IP and port on the same network
- Fastest for in-office testing
- Least stable for repeated testing

2. Zip plus run guide
- Share the project files without `node_modules` and without `.env.local`
- Teammates run `npm install` and create their own `.env.local`
- Good for developers, not ideal for business testers

## Project Principles

- Excel files are modeling references only, not runtime dependencies.
- The source of truth lives in typed code under `lib/config/*`.
- Calculation steps are meant to stay inspectable and testable.
- UI components should display logic, not hide it.

## Validation

Useful commands:

```bash
npm run lint
npm run test
npm run build
```

## Deployment Checklist

Before sharing broadly:
- confirm map loads on desktop and mobile
- confirm address search works on the deployed domain
- confirm Google Solar route responds without server errors
- confirm the browser key has referrer restrictions
- confirm the Solar key is not exposed to the client
- confirm the quote engine does not oversize beyond Google-matched roof fit
