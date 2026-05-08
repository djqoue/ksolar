-- KSolar CRM/Auth foundation.
-- Source of truth for sales users, customers, quote history, and automation events.

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  primary_email citext,
  primary_phone text,
  display_name text,
  role text not null default 'sales_rep' check (role in ('sales_rep', 'sales_manager', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  owner_user_id uuid not null references public.sales_profiles(id) on delete restrict,
  display_name text not null,
  primary_phone text,
  primary_email citext,
  line_id text,
  lead_source text,
  status text not null default 'lead' check (status in ('lead', 'qualified', 'quoted', 'won', 'lost', 'after_sales')),
  consent_to_contact boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  owner_user_id uuid not null references public.sales_profiles(id) on delete restrict,
  site_label text,
  address_text text,
  province text,
  district text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  utility_provider text not null default 'unknown' check (utility_provider in ('PEA', 'MEA', 'unknown')),
  meter_phase text not null default 'unknown' check (meter_phase in ('1P', '3P', 'unknown')),
  roof_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_power_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  site_id uuid references public.customer_sites(id) on delete set null,
  owner_user_id uuid not null references public.sales_profiles(id) on delete restrict,
  monthly_bill_thb numeric(12,2),
  monthly_kwh numeric(12,2),
  peak_usage_window text,
  occupants_count integer,
  aircon_count integer,
  ev_count integer,
  pool_pump_count integer,
  water_heater_count integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_appliances (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  power_profile_id uuid not null references public.household_power_profiles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  owner_user_id uuid not null references public.sales_profiles(id) on delete restrict,
  appliance_type text not null,
  label text not null,
  quantity integer not null default 1 check (quantity > 0),
  rated_power_w numeric(12,2),
  estimated_hours_per_day numeric(5,2),
  inverter_load boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  site_id uuid references public.customer_sites(id) on delete set null,
  owner_user_id uuid not null references public.sales_profiles(id) on delete restrict,
  stage text not null default 'new' check (stage in ('new', 'site_survey', 'proposal', 'negotiation', 'won', 'lost')),
  estimated_budget_thb numeric(12,2),
  desired_system_kwp numeric(8,2),
  expected_close_date date,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  site_id uuid references public.customer_sites(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  owner_user_id uuid not null references public.sales_profiles(id) on delete restrict,
  visit_type text not null default 'site_visit' check (visit_type in ('call', 'site_visit', 'online_meeting', 'follow_up', 'after_sales')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  outcome text,
  next_follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  site_id uuid references public.customer_sites(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  owner_user_id uuid not null references public.sales_profiles(id) on delete restrict,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'presented', 'accepted', 'rejected', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  quote_project_id uuid not null references public.quote_projects(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  owner_user_id uuid references public.sales_profiles(id) on delete restrict,
  version_no integer not null check (version_no > 0),
  quote_code text not null unique,
  selected_tier_id text,
  system_size_wp numeric(12,2),
  sell_price_thb numeric(14,2),
  finance_adjusted_price_thb numeric(14,2),
  annual_generation_kwh numeric(14,2),
  payback_years numeric(8,2),
  irr_percent numeric(8,4),
  status text not null default 'draft' check (status in ('draft', 'presented', 'accepted', 'rejected', 'expired')),
  created_by uuid references public.sales_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (quote_project_id, version_no)
);

create table if not exists public.quote_inputs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  quote_version_id uuid not null unique references public.quote_versions(id) on delete cascade,
  owner_user_id uuid references public.sales_profiles(id) on delete restrict,
  map_selection jsonb not null default '{}'::jsonb,
  quote_input jsonb not null default '{}'::jsonb,
  google_solar_summary jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_outputs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  quote_version_id uuid not null unique references public.quote_versions(id) on delete cascade,
  owner_user_id uuid references public.sales_profiles(id) on delete restrict,
  quote_result jsonb not null default '{}'::jsonb,
  explanation jsonb not null default '[]'::jsonb,
  warnings text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.bom_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  quote_version_id uuid not null unique references public.quote_versions(id) on delete cascade,
  owner_user_id uuid references public.sales_profiles(id) on delete restrict,
  bom_snapshot jsonb not null default '{}'::jsonb,
  hardware_cost_thb numeric(14,2),
  created_at timestamptz not null default now()
);

create table if not exists public.finance_scenarios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  quote_version_id uuid not null unique references public.quote_versions(id) on delete cascade,
  owner_user_id uuid references public.sales_profiles(id) on delete restrict,
  finance_snapshot jsonb not null default '{}'::jsonb,
  monthly_payment_thb numeric(14,2),
  down_payment_thb numeric(14,2),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references public.sales_profiles(id) on delete set null,
  customer_id uuid references public.customers(id) on delete cascade,
  quote_project_id uuid references public.quote_projects(id) on delete set null,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  owner_user_id uuid references public.sales_profiles(id) on delete set null,
  source text not null default 'ksolar',
  aggregate_type text not null check (aggregate_type in ('customer', 'opportunity', 'quote', 'visit', 'order', 'service_ticket')),
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed', 'cancelled')),
  attempts integer not null default 0,
  scheduled_for timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists set_sales_profiles_updated_at on public.sales_profiles;
create trigger set_sales_profiles_updated_at before update on public.sales_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists set_customer_sites_updated_at on public.customer_sites;
create trigger set_customer_sites_updated_at before update on public.customer_sites
  for each row execute function public.set_updated_at();

drop trigger if exists set_household_power_profiles_updated_at on public.household_power_profiles;
create trigger set_household_power_profiles_updated_at before update on public.household_power_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_household_appliances_updated_at on public.household_appliances;
create trigger set_household_appliances_updated_at before update on public.household_appliances
  for each row execute function public.set_updated_at();

drop trigger if exists set_opportunities_updated_at on public.opportunities;
create trigger set_opportunities_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();

drop trigger if exists set_visits_updated_at on public.visits;
create trigger set_visits_updated_at before update on public.visits
  for each row execute function public.set_updated_at();

drop trigger if exists set_quote_projects_updated_at on public.quote_projects;
create trigger set_quote_projects_updated_at before update on public.quote_projects
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_sales_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sales_profiles (id, primary_email, primary_phone, display_name)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.email, new.phone)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_sales_user();

create or replace function public.ksolar_can_access_org(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sales_profiles profile
    where profile.id = (select auth.uid())
      and profile.active = true
      and profile.org_id = target_org_id
      and profile.role in ('sales_manager', 'admin')
  );
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations',
    'sales_profiles',
    'customers',
    'customer_sites',
    'household_power_profiles',
    'household_appliances',
    'opportunities',
    'visits',
    'quote_projects',
    'quote_versions',
    'quote_inputs',
    'quote_outputs',
    'bom_snapshots',
    'finance_scenarios',
    'activity_logs',
    'automation_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy "sales profiles are readable by owner or org managers"
on public.sales_profiles for select
to authenticated
using (id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "organizations are readable by members"
on public.organizations for select
to authenticated
using (
  exists (
    select 1
    from public.sales_profiles profile
    where profile.id = (select auth.uid())
      and profile.org_id = organizations.id
  )
);

create policy "customers owner or org manager select"
on public.customers for select
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "customers owner insert"
on public.customers for insert
to authenticated
with check (owner_user_id = (select auth.uid()));

create policy "customers owner or org manager update"
on public.customers for update
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "owned customer data select"
on public.customer_sites for select
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "owned customer data insert"
on public.customer_sites for insert
to authenticated
with check (owner_user_id = (select auth.uid()));

create policy "owned customer data update"
on public.customer_sites for update
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "power profiles owner access"
on public.household_power_profiles for all
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "appliances owner access"
on public.household_appliances for all
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "opportunities owner access"
on public.opportunities for all
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "visits owner access"
on public.visits for all
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "quote projects owner access"
on public.quote_projects for all
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "quote versions owner access"
on public.quote_versions for all
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "quote inputs owner access"
on public.quote_inputs for all
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "quote outputs owner access"
on public.quote_outputs for all
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "bom snapshots owner access"
on public.bom_snapshots for all
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "finance scenarios owner access"
on public.finance_scenarios for all
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id))
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "activity logs org read"
on public.activity_logs for select
to authenticated
using (actor_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "activity logs owner insert"
on public.activity_logs for insert
to authenticated
with check (actor_user_id = (select auth.uid()));

create policy "automation events org read"
on public.automation_events for select
to authenticated
using (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create policy "automation events owner insert"
on public.automation_events for insert
to authenticated
with check (owner_user_id = (select auth.uid()) or public.ksolar_can_access_org(org_id));

create index if not exists sales_profiles_org_idx on public.sales_profiles(org_id);
create index if not exists customers_owner_idx on public.customers(owner_user_id, updated_at desc);
create index if not exists customers_org_status_idx on public.customers(org_id, status);
create index if not exists customer_sites_customer_idx on public.customer_sites(customer_id);
create index if not exists power_profiles_customer_idx on public.household_power_profiles(customer_id);
create index if not exists appliances_power_profile_idx on public.household_appliances(power_profile_id);
create index if not exists opportunities_owner_stage_idx on public.opportunities(owner_user_id, stage, updated_at desc);
create index if not exists visits_owner_schedule_idx on public.visits(owner_user_id, scheduled_at desc);
create index if not exists quote_projects_customer_idx on public.quote_projects(customer_id, updated_at desc);
create index if not exists quote_versions_project_idx on public.quote_versions(quote_project_id, version_no desc);
create index if not exists automation_events_owner_idx on public.automation_events(owner_user_id, status, scheduled_for);
create index if not exists automation_events_status_schedule_idx on public.automation_events(status, scheduled_for);

grant select on public.organizations to authenticated;
grant select on public.sales_profiles to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.customer_sites to authenticated;
grant select, insert, update, delete on public.household_power_profiles to authenticated;
grant select, insert, update, delete on public.household_appliances to authenticated;
grant select, insert, update, delete on public.opportunities to authenticated;
grant select, insert, update, delete on public.visits to authenticated;
grant select, insert, update, delete on public.quote_projects to authenticated;
grant select, insert, update, delete on public.quote_versions to authenticated;
grant select, insert, update, delete on public.quote_inputs to authenticated;
grant select, insert, update, delete on public.quote_outputs to authenticated;
grant select, insert, update, delete on public.bom_snapshots to authenticated;
grant select, insert, update, delete on public.finance_scenarios to authenticated;
grant select, insert on public.activity_logs to authenticated;
grant select, insert on public.automation_events to authenticated;
