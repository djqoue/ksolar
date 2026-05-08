# KSolar Production Architecture

## Recommended v1.0 Deployment

For the first sales-team test release, keep the platform simple:

- App hosting: Vercel
- Framework: Next.js App Router
- Database and auth: Supabase
- File exports later: Supabase Storage or Vercel Blob
- Google APIs:
  - browser key for Maps JavaScript API
  - server key for Solar API

This avoids managing a server while still giving us real accounts, persistent quotes, and audit history.

## Environment Variables

Vercel production and preview environments should contain:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `GOOGLE_SOLAR_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Rules:

- Only `NEXT_PUBLIC_*` values can be exposed to the browser.
- `GOOGLE_SOLAR_API_KEY` stays server-side.
- `SUPABASE_SERVICE_ROLE_KEY` stays server-side.
- Production and preview should use separate keys where possible.

## Account Model

### Roles

- `admin`
  - manage users
  - manage equipment catalog
  - view all quotes
  - change pricing and finance rules
- `sales_manager`
  - view team quotes
  - review quote quality
  - approve discount exceptions later
- `sales`
  - create and edit own quotes
  - view own customers and proposals
- `ops`
  - review BOM and installation assumptions
  - update technical status after handoff

### Login

Recommended first version:

- email + password
- optional magic link later

Reason:

- easy to create accounts for each salesperson
- simple enough for internal testing
- compatible with Supabase Auth and row-level security

## Database Modules

Use Postgres tables with Row Level Security.

### `profiles`

Purpose:

- one row per user

Fields:

- `id uuid primary key references auth.users`
- `full_name text`
- `role text`
- `team_id uuid`
- `phone text`
- `created_at timestamptz`

### `teams`

Purpose:

- group sales users by branch or manager

Fields:

- `id uuid primary key`
- `name text`
- `region text`
- `created_at timestamptz`

### `customers`

Purpose:

- customer records created by sales

Fields:

- `id uuid primary key`
- `owner_id uuid`
- `team_id uuid`
- `name text`
- `phone text`
- `address text`
- `latitude numeric`
- `longitude numeric`
- `created_at timestamptz`

### `quotes`

Purpose:

- saved quote sessions

Fields:

- `id uuid primary key`
- `customer_id uuid`
- `owner_id uuid`
- `team_id uuid`
- `status text`
- `input_json jsonb`
- `result_json jsonb`
- `google_solar_json jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

### `quote_events`

Purpose:

- audit trail and future AI workflow trigger source

Fields:

- `id uuid primary key`
- `quote_id uuid`
- `actor_id uuid`
- `event_type text`
- `payload_json jsonb`
- `created_at timestamptz`

### `catalog_versions`

Purpose:

- track rule/config versions used in each quote

Fields:

- `id uuid primary key`
- `name text`
- `effective_from timestamptz`
- `config_hash text`
- `notes text`

## Row Level Security Rules

Default rule:

- sales can access only their own records
- sales managers can access records for their team
- admins can access all records
- ops can access installation-related quote data

Important:

- Enable RLS on every table in the public schema.
- Keep service-role operations inside server routes only.
- Do not let the browser write privileged fields such as `owner_id`, `team_id`, or `role`.

## API Boundary

Keep the calculator pure and add server routes around persistence:

- `POST /api/quotes`
  - validate input
  - run calculation
  - save quote and result
- `GET /api/quotes`
  - list quotes based on role
- `GET /api/quotes/:id`
  - load one quote
- `POST /api/quotes/:id/events`
  - append audit or workflow events
- `POST /api/solar/building-insights`
  - future version can move from GET to POST with saved request context

## Deployment Stages

### Stage 1: Internal test

- public Vercel URL
- no auth or shared password gate
- no database
- collect feedback manually

### Stage 2: Controlled sales pilot

- Supabase Auth
- user accounts
- saved quotes
- owner/team access rules
- basic admin user creation

### Stage 3: Operating system

- quote approval workflow
- export proposal PDF
- installation handoff
- AI summary and follow-up tasks
- catalog version management

## Recommended v1.0 Decision

Do not block this week's field test on accounts and database.

Recommended path:

- keep the current Vercel deployment for immediate v1.0 testing
- add a visible build/version label
- collect tester feedback using screenshots and a shared form
- start Supabase Auth and quote persistence as the next production hardening branch

That keeps the team moving while we build the durable backend properly.

## References

- Vercel environment variables: https://vercel.com/docs/projects/environment-variables
- Supabase Auth with Next.js: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
