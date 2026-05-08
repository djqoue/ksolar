# Auth And CRM Rollout Plan

## Phase 1: Internal Sales Login

Use Supabase Auth with:

- Email/password for the first internal test.
- Optional phone OTP after an SMS provider is configured.
- `sales_profiles.id = auth.users.id` as the salesperson primary id.

Required Vercel environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Legacy key fallback is supported:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Phase 2: Customer Data Capture

Add customer creation screens for:

- customer name
- phone
- email
- LINE id
- address
- PEA/MEA
- meter phase
- monthly bill
- monthly kWh
- large appliances
- visit notes
- next follow-up date

The quote workflow should allow selecting an existing customer or creating a customer before saving a quote.

## Phase 3: Quote History

When a salesperson saves a proposal:

1. Create or reuse `quote_projects`.
2. Insert a new `quote_versions` row.
3. Save `quote_inputs`.
4. Save `quote_outputs`.
5. Save `bom_snapshots`.
6. Save `finance_scenarios`.
7. Append `activity_logs`.

Each quote version must be immutable. If the salesperson changes package size or finance terms, create a new version.

## Phase 4: Management View

Managers should filter by:

- salesperson
- customer status
- opportunity stage
- province
- system size
- quoted value
- expected close date
- last visit date

The database already reserves `org_id` and role-based RLS for this.

## Phase 5: Automation

Use `automation_events` as the integration boundary.

Do not directly call warehouse, installation, or after-sales systems from React components.

Recommended flow:

```text
Quote accepted
  -> insert automation_events('quote.accepted')
  -> worker creates warehouse reservation request
  -> worker creates installation matching request
  -> worker schedules customer reminders
```

This keeps each module independently testable and prevents the UI from becoming a hidden workflow engine.
