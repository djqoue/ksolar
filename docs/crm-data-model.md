# KSolar CRM Data Model

## Goal

The CRM layer gives every important business object a stable primary id so management can trace data across the whole sales lifecycle:

- `sales_profiles.id`: one salesperson account, backed by `auth.users.id`.
- `customers.id`: one customer record, including SRM-style relationship data.
- `customer_sites.id`: one physical site or home address for a customer.
- `quote_projects.id`: one quotation workspace for a customer/site.
- `quote_versions.id`: one immutable quote version shown to a customer.
- `automation_events.id`: one event that can later drive warehouse, installation, or after-sales workflows.

## Naming Rules

- Database tables and columns use `snake_case`.
- TypeScript domain objects use `camelCase`.
- Primary ids are always named `id` in the table itself.
- Foreign keys must be explicit: `customer_id`, `owner_user_id`, `quote_project_id`, `quote_version_id`.
- Sales ownership is always represented by `owner_user_id`.
- Organization/team scope is always represented by `org_id`.
- Quote history must be saved as snapshots. Do not recompute old quotes from new rules.

## Core Tables

### `sales_profiles`

One row per authenticated salesperson.

- Primary key: `id`, references `auth.users(id)`.
- Login identities: email/phone live in Supabase Auth; the public profile stores `primary_email` and `primary_phone` for reporting.
- Role model: `sales_rep`, `sales_manager`, `admin`.

### `customers`

One customer or household decision-maker.

Important fields:

- `owner_user_id`: salesperson responsible for this customer.
- `display_name`
- `primary_phone`
- `primary_email`
- `line_id`
- `lead_source`
- `status`
- `consent_to_contact`

### `customer_sites`

One physical installation location.

Important fields:

- `customer_id`
- `address_text`
- `latitude`
- `longitude`
- `utility_provider`: `PEA`, `MEA`, or `unknown`
- `meter_phase`: `1P`, `3P`, or `unknown`
- `roof_notes`

### `household_power_profiles`

Customer electricity behavior used to improve ROI accuracy.

Important fields:

- `monthly_bill_thb`
- `monthly_kwh`
- `peak_usage_window`
- `occupants_count`
- major appliance counters such as `aircon_count`, `ev_count`, `pool_pump_count`, `water_heater_count`

### `quote_versions`

Immutable quote version. This is the customer-facing commercial record.

Stores headline values:

- selected tier
- system size
- sell price
- finance-adjusted price
- annual generation
- payback
- IRR

### Snapshot Tables

These preserve the exact quote context:

- `quote_inputs`
- `quote_outputs`
- `bom_snapshots`
- `finance_scenarios`

The calculation engine may change in the future, but old quote snapshots remain auditable.

## Access Control

The first release uses owner-based RLS:

- Sales users can access rows where `owner_user_id = auth.uid()`.
- Managers/admins can access rows in their `org_id` through `ksolar_can_access_org(org_id)`.
- Service-role automation can process records server-side without exposing broad access to browsers.
- Automation events may also store `owner_user_id` so sales users can see reminders tied to their own customers.

## Automation Interface

`automation_events` is the future integration seam.

Example events:

- `quote.accepted`
- `warehouse.reserve_requested`
- `installation.match_requested`
- `site_survey.follow_up_due`
- `after_sales.warranty_check_due`

The UI should create business records first, then append automation events. Automation workers can consume those events later without coupling warehouse or installation logic to the quote UI.
