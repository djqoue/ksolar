-- Remote migration 20260718064300: harden public account creation and CRM tenant boundaries before production launch.

-- Identifier availability must not be exposed to anonymous callers. Unique indexes
-- remain the source of truth and Supabase Auth returns the public signup result.
drop function if exists public.check_sales_identifier_available(text, text);

-- A deliberately minimal database probe for the public deployment health endpoint.
-- It exposes no row data and only confirms that PostgREST can execute a DB query.
create or replace function public.ksolar_healthcheck()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.ksolar_healthcheck() from public;
grant execute on function public.ksolar_healthcheck() to anon, authenticated;

create or replace function public.ksolar_can_access_org(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_org_id is not null
    and exists (
      select 1
      from public.sales_profiles profile
      where profile.id = (select auth.uid())
        and profile.active = true
        and profile.org_id = target_org_id
        and profile.role in ('sales_manager', 'admin')
    );
$$;

create or replace function public.ksolar_can_access_record(
  target_owner_user_id uuid,
  target_org_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sales_profiles profile
    where profile.id = (select auth.uid())
      and profile.active = true
      and (
        (
          profile.id = target_owner_user_id
          and profile.org_id is not distinct from target_org_id
        )
        or (
          target_org_id is not null
          and profile.org_id = target_org_id
          and profile.role in ('sales_manager', 'admin')
        )
      )
  );
$$;

revoke all on function public.ksolar_can_access_org(uuid) from public, anon;
revoke all on function public.ksolar_can_access_record(uuid, uuid) from public, anon;
grant execute on function public.ksolar_can_access_org(uuid) to authenticated;
grant execute on function public.ksolar_can_access_record(uuid, uuid) to authenticated;

-- Enforce duplicated owner/org keys at the database boundary. This protects writes
-- made through authenticated clients as well as future service-role integrations.
create or replace function public.ksolar_validate_business_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  row_org_id uuid;
  row_owner_user_id uuid;
  row_actor_user_id uuid;
  row_customer_id uuid;
  row_site_id uuid;
  row_opportunity_id uuid;
  scope_user_id uuid;
  scope_is_valid boolean;
begin
  row_data := to_jsonb(new);
  row_org_id := nullif(row_data ->> 'org_id', '')::uuid;
  row_owner_user_id := nullif(row_data ->> 'owner_user_id', '')::uuid;
  row_actor_user_id := nullif(row_data ->> 'actor_user_id', '')::uuid;
  row_customer_id := nullif(row_data ->> 'customer_id', '')::uuid;
  row_site_id := nullif(row_data ->> 'site_id', '')::uuid;
  row_opportunity_id := nullif(row_data ->> 'opportunity_id', '')::uuid;
  scope_user_id := coalesce(row_owner_user_id, row_actor_user_id);

  if scope_user_id is not null then
    select exists (
      select 1
      from public.sales_profiles profile
      where profile.id = scope_user_id
        and profile.org_id is not distinct from row_org_id
    ) into scope_is_valid;

    if not scope_is_valid then
      raise exception 'KSolar owner and organization scope do not match'
        using errcode = '23514';
    end if;
  end if;

  if tg_table_name = 'customer_sites' then
    select exists (
      select 1
      from public.customers customer
      where customer.id = row_customer_id
        and customer.owner_user_id = row_owner_user_id
        and customer.org_id is not distinct from row_org_id
    ) into scope_is_valid;

  elsif tg_table_name = 'household_power_profiles' then
    select exists (
      select 1
      from public.customers customer
      where customer.id = row_customer_id
        and customer.owner_user_id = row_owner_user_id
        and customer.org_id is not distinct from row_org_id
    ) and (
      row_site_id is null
      or exists (
        select 1
        from public.customer_sites site
        where site.id = row_site_id
          and site.customer_id = row_customer_id
          and site.owner_user_id = row_owner_user_id
          and site.org_id is not distinct from row_org_id
      )
    ) into scope_is_valid;

  elsif tg_table_name = 'household_appliances' then
    select exists (
      select 1
      from public.customers customer
      where customer.id = row_customer_id
        and customer.owner_user_id = row_owner_user_id
        and customer.org_id is not distinct from row_org_id
    ) and exists (
      select 1
      from public.household_power_profiles power_profile
      where power_profile.id = nullif(row_data ->> 'power_profile_id', '')::uuid
        and power_profile.customer_id = row_customer_id
        and power_profile.owner_user_id = row_owner_user_id
        and power_profile.org_id is not distinct from row_org_id
    ) into scope_is_valid;

  elsif tg_table_name = 'opportunities' then
    select exists (
      select 1
      from public.customers customer
      where customer.id = row_customer_id
        and customer.owner_user_id = row_owner_user_id
        and customer.org_id is not distinct from row_org_id
    ) and (
      row_site_id is null
      or exists (
        select 1
        from public.customer_sites site
        where site.id = row_site_id
          and site.customer_id = row_customer_id
          and site.owner_user_id = row_owner_user_id
          and site.org_id is not distinct from row_org_id
      )
    ) into scope_is_valid;

  elsif tg_table_name in ('visits', 'quote_projects') then
    select exists (
      select 1
      from public.customers customer
      where customer.id = row_customer_id
        and customer.owner_user_id = row_owner_user_id
        and customer.org_id is not distinct from row_org_id
    ) and (
      row_site_id is null
      or exists (
        select 1
        from public.customer_sites site
        where site.id = row_site_id
          and site.customer_id = row_customer_id
          and site.owner_user_id = row_owner_user_id
          and site.org_id is not distinct from row_org_id
      )
    ) and (
      row_opportunity_id is null
      or exists (
        select 1
        from public.opportunities opportunity
        where opportunity.id = row_opportunity_id
          and opportunity.customer_id = row_customer_id
          and opportunity.owner_user_id = row_owner_user_id
          and opportunity.org_id is not distinct from row_org_id
          and (
            row_site_id is null
            or opportunity.site_id is null
            or opportunity.site_id = row_site_id
          )
      )
    ) into scope_is_valid;

  elsif tg_table_name = 'quote_versions' then
    select exists (
      select 1
      from public.quote_projects project
      where project.id = nullif(row_data ->> 'quote_project_id', '')::uuid
        and project.owner_user_id = row_owner_user_id
        and project.org_id is not distinct from row_org_id
        and (row_customer_id is null or project.customer_id = row_customer_id)
    ) into scope_is_valid;

  elsif tg_table_name in ('quote_inputs', 'quote_outputs', 'bom_snapshots', 'finance_scenarios') then
    select exists (
      select 1
      from public.quote_versions version
      where version.id = nullif(row_data ->> 'quote_version_id', '')::uuid
        and version.owner_user_id is not distinct from row_owner_user_id
        and version.org_id is not distinct from row_org_id
    ) into scope_is_valid;

  elsif tg_table_name = 'activity_logs' then
    select (
      row_customer_id is null
      or exists (
        select 1
        from public.customers customer
        where customer.id = row_customer_id
          and customer.org_id is not distinct from row_org_id
      )
    ) and (
      nullif(row_data ->> 'quote_project_id', '') is null
      or exists (
        select 1
        from public.quote_projects project
        where project.id = nullif(row_data ->> 'quote_project_id', '')::uuid
          and project.org_id is not distinct from row_org_id
          and (row_customer_id is null or project.customer_id = row_customer_id)
      )
    ) into scope_is_valid;

  elsif tg_table_name = 'automation_events'
    and row_data ->> 'aggregate_type' = 'customer' then
    select exists (
      select 1
      from public.customers customer
      where customer.id = nullif(row_data ->> 'aggregate_id', '')::uuid
        and customer.owner_user_id = row_owner_user_id
        and customer.org_id is not distinct from row_org_id
    ) into scope_is_valid;

  else
    scope_is_valid := true;
  end if;

  if not scope_is_valid then
    raise exception 'KSolar parent and child scope do not match for %', tg_table_name
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.ksolar_validate_business_scope() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
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
    execute format('drop trigger if exists ksolar_validate_business_scope on public.%I', table_name);
    execute format(
      'create trigger ksolar_validate_business_scope before insert or update on public.%I for each row execute function public.ksolar_validate_business_scope()',
      table_name
    );
  end loop;
end $$;

drop policy if exists "sales profiles are readable by owner or org managers" on public.sales_profiles;
create policy "sales profiles are readable by owner or org managers"
on public.sales_profiles for select
to authenticated
using (public.ksolar_can_access_record(id, org_id));

drop policy if exists "organizations are readable by members" on public.organizations;
create policy "organizations are readable by members"
on public.organizations for select
to authenticated
using (public.ksolar_can_access_record((select auth.uid()), id));

drop policy if exists "customers owner or org manager select" on public.customers;
create policy "customers owner or org manager select"
on public.customers for select
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "customers owner insert" on public.customers;
create policy "customers owner insert"
on public.customers for insert
to authenticated
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "customers owner or org manager update" on public.customers;
create policy "customers owner or org manager update"
on public.customers for update
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "owned customer data select" on public.customer_sites;
create policy "owned customer data select"
on public.customer_sites for select
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "owned customer data insert" on public.customer_sites;
create policy "owned customer data insert"
on public.customer_sites for insert
to authenticated
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "owned customer data update" on public.customer_sites;
create policy "owned customer data update"
on public.customer_sites for update
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "power profiles owner access" on public.household_power_profiles;
create policy "power profiles owner access"
on public.household_power_profiles for all
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "appliances owner access" on public.household_appliances;
create policy "appliances owner access"
on public.household_appliances for all
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "opportunities owner access" on public.opportunities;
create policy "opportunities owner access"
on public.opportunities for all
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "visits owner access" on public.visits;
create policy "visits owner access"
on public.visits for all
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "quote projects owner access" on public.quote_projects;
create policy "quote projects owner access"
on public.quote_projects for all
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "quote versions owner access" on public.quote_versions;
create policy "quote versions owner access"
on public.quote_versions for all
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "quote inputs owner access" on public.quote_inputs;
create policy "quote inputs owner access"
on public.quote_inputs for all
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "quote outputs owner access" on public.quote_outputs;
create policy "quote outputs owner access"
on public.quote_outputs for all
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "bom snapshots owner access" on public.bom_snapshots;
create policy "bom snapshots owner access"
on public.bom_snapshots for all
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "finance scenarios owner access" on public.finance_scenarios;
create policy "finance scenarios owner access"
on public.finance_scenarios for all
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id))
with check (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "activity logs org read" on public.activity_logs;
create policy "activity logs org read"
on public.activity_logs for select
to authenticated
using (public.ksolar_can_access_record(actor_user_id, org_id));

drop policy if exists "activity logs owner insert" on public.activity_logs;
create policy "activity logs owner insert"
on public.activity_logs for insert
to authenticated
with check (
  actor_user_id = (select auth.uid())
  and public.ksolar_can_access_record(actor_user_id, org_id)
);

drop policy if exists "automation events org read" on public.automation_events;
create policy "automation events org read"
on public.automation_events for select
to authenticated
using (public.ksolar_can_access_record(owner_user_id, org_id));

drop policy if exists "automation events owner insert" on public.automation_events;
create policy "automation events owner insert"
on public.automation_events for insert
to authenticated
with check (public.ksolar_can_access_record(owner_user_id, org_id));
