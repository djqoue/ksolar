# KSolar

KSolar is a Next.js sales application for Thai rooftop-solar screening and quotation. It preserves one traceable path from roof selection to capacity, electrical checks, BOM, price, finance, and project returns.

## Production architecture

- **Vercel / Next.js App Router** hosts the web UI and authenticated server routes.
- **Supabase Auth + Postgres** handles sales accounts, CRM records, quote versions, and Row Level Security.
- **Google Maps JavaScript API** provides address search and roof drawing in the browser.
- **Google Solar API** is called only through authenticated server routes; the key is never sent to the browser.
- **Typed calculation modules** under `lib/calc/*` and versioned configuration under `lib/config/*` are the runtime source of truth. Excel files are not runtime dependencies.

The main data flow is:

`address and roof selection -> Google/manual roof evidence -> capacity intent -> electrical validation -> BOM and pricing -> Thailand tariff/finance -> saved Supabase quote`

## Quotation modes

- Standard packages are **5, 10, 15, and 20 kW targets**. Installed DC capacity is rounded up to a whole selected module.
- One-phase packages currently allow 5 and 10 kW. Three-phase packages allow 5, 10, 15, and 20 kW.
- **Roof maximum** has no package cap, but is a technical-potential result only. It has no committed price or BOM and cannot be saved as a formal quote.
- A formal quote is produced only when the roof supports the selected package and a compatible inverter/BOM can be resolved.

See [calculation formulas](./docs/formulas.md), [Google Solar accuracy and roadmap](./docs/google-solar-roadmap.md), and [v1 release notes](./docs/release-notes-v1.md).

## Local setup

Requirements: Node.js 20+ and npm 10+.

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Required environment variables:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=browser_maps_key
GOOGLE_MAPS_API_KEY=server_geocoding_key
GOOGLE_SOLAR_API_KEY=server_solar_key
NEXT_PUBLIC_SUPABASE_URL=supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=server_only_service_role_key
KSOLAR_ENABLE_PUBLIC_SIGNUP=false
```

Security rules:

- Restrict the browser Maps key to `https://ksolar.top/*`, approved Vercel preview domains, and the required browser APIs.
- Restrict server keys to their required Google APIs. Never expose them through `NEXT_PUBLIC_*`.
- Keep the Supabase service-role key server-only. Never use it in a client component.
- Keep public signup disabled unless Supabase Auth, profile creation, and operational approval are ready.

## Operational boundaries

- Google Solar is remote-screening evidence, not a site survey, structural report, electrical design, or construction CAD.
- Google `BASE` imagery is reference-only in KSolar and cannot override formal panel count, yield, BOM, or pricing.
- Thailand policy and bank assumptions were last verified on **2026-07-18**. Validity dates and official sources are recorded in `lib/config/thailand-energy-policy.ts` and `lib/config/finance-products.ts`.
- Bank approval, collateral, insurance, floating rates, tax eligibility, grid approval, and actual export limits must be confirmed by the responsible provider.
- UI review follows Apple's Human Interface Guidelines as a product-design baseline: preserve user context, make status visible, provide clear next actions, support reversal, and keep touch targets usable. This is a review standard, not an Apple certification.

## Release validation

Run the full local gate before deployment:

```bash
npm run lint
npm run test
npm run build
```

After deploying to `ksolar.top`, verify:

1. `GET https://ksolar.top/api/health` returns HTTP 200 with `auth: "ok"` and `database: "ok"`.
2. A production sales user can sign in, save a customer and formal quote, reload it, and remains restricted to authorized data.
3. Address search, roof drawing, back navigation, and returning to Step 3 preserve the selected address and roof.
4. Google Solar returns through the authenticated proxy without exposing `GOOGLE_SOLAR_API_KEY`; unavailable or BASE-only locations fall back safely.
5. 5/10/15/20 kW availability changes correctly by phase, roof fit, selected module, and compatible inverter.
6. Roof maximum is labelled technical-only and cannot be saved as a formal quote.
7. Monthly bill caps self-use savings; export revenue is zero until grid export is marked approved.
8. Vercel production variables, custom-domain DNS/TLS, Google key restrictions, and Supabase migrations are all confirmed in the production environment.
