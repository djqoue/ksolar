-- Remote migration 20260718064305: atomically create a quote project (or append a version) and all immutable
-- calculation snapshots. Ownership, organization, parent scope, and headline
-- commercial values are derived or validated inside the database.

drop function if exists public.save_quote_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
);

drop function if exists public.save_quote_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
);

create or replace function public.save_quote_atomic(
  p_actor_user_id uuid,
  p_quote_project_id uuid,
  p_quote_version_id uuid,
  p_customer_id uuid,
  p_site_id uuid,
  p_opportunity_id uuid,
  p_title text,
  p_quote_input jsonb,
  p_quote_result jsonb,
  p_bom_snapshot jsonb,
  p_finance_snapshot jsonb
)
returns table (
  quote_project_id uuid,
  quote_version_id uuid,
  quote_code text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_org_id uuid;
  v_profile_active boolean;
  v_customer_name text;
  v_project_id uuid;
  v_existing_customer_id uuid;
  v_existing_project boolean := false;
  v_project_created_at timestamptz;
  v_project_site_id uuid;
  v_project_opportunity_id uuid;
  v_opportunity_site_id uuid;
  v_version_id uuid;
  v_version_no integer;
  v_quote_code text;
  v_title text := nullif(pg_catalog.btrim(p_title), '');
  v_selected_tier_id text;
  v_system_size_wp numeric;
  v_sell_price_thb numeric;
  v_finance_adjusted_price_thb numeric;
  v_annual_generation_kwh numeric;
  v_payback_years numeric;
  v_irr_percent numeric;
  v_hardware_cost_thb numeric;
  v_monthly_payment_thb numeric;
  v_down_payment_thb numeric;
  v_warnings text[];
  v_google_solar_summary jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using
      errcode = '42501',
      message = 'The service role is required to save a quote.';
  end if;

  v_user_id := p_actor_user_id;

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'A verified actor is required to save a quote.';
  end if;

  select profile.org_id, profile.active
  into v_org_id, v_profile_active
  from public.sales_profiles as profile
  where profile.id = v_user_id
  for share;

  if not found or v_profile_active is not true then
    raise exception using
      errcode = '42501',
      message = 'An active sales profile is required to save a quote.';
  end if;

  v_version_id := coalesce(p_quote_version_id, pg_catalog.gen_random_uuid());

  -- Serialize retries and concurrent submissions that share the same idempotency key.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_version_id::text, 0)
  );

  select
    version.quote_project_id,
    version.customer_id,
    version.quote_code
  into
    v_project_id,
    v_existing_customer_id,
    v_quote_code
  from public.quote_versions as version
  where version.id = v_version_id
    and version.owner_user_id = v_user_id
    and version.org_id is not distinct from v_org_id;

  if found then
    if v_existing_customer_id is distinct from p_customer_id
      or (
        p_quote_project_id is not null
        and v_project_id is distinct from p_quote_project_id
      )
    then
      raise exception using
        errcode = '23505',
        message = 'The quote version idempotency key is already bound to another quote.';
    end if;

    return query
    select v_project_id, v_version_id, v_quote_code;
    return;
  end if;

  if exists (
    select 1
    from public.quote_versions as version
    where version.id = v_version_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'The quote version idempotency key is unavailable.';
  end if;

  if p_customer_id is null then
    raise exception using errcode = '22023', message = 'A customer is required to save a quote.';
  end if;

  select customer.display_name
  into v_customer_name
  from public.customers as customer
  where customer.id = p_customer_id
    and customer.owner_user_id = v_user_id
    and customer.org_id is not distinct from v_org_id
  for share;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'The selected customer is not owned by the current sales account and organization.';
  end if;

  if v_title is not null and pg_catalog.char_length(v_title) > 240 then
    raise exception using errcode = '22023', message = 'Quote title must be at most 240 characters.';
  end if;

  if pg_catalog.jsonb_typeof(p_quote_input) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_quote_input -> 'map') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_quote_input -> 'topology') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_quote_input -> 'pricingPresetId') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_quote_input -> 'selectedFinanceIds') is distinct from 'array'
  then
    raise exception using errcode = '22023', message = 'Quote input must be a complete JSON object.';
  end if;

  if pg_catalog.octet_length(p_quote_input::text) > 1048576 then
    raise exception using errcode = '22023', message = 'Quote input is too large.';
  end if;

  if pg_catalog.jsonb_array_length(p_quote_input -> 'selectedFinanceIds') > 50
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_quote_input -> 'selectedFinanceIds') as finance_id(value)
      where pg_catalog.jsonb_typeof(finance_id.value) is distinct from 'string'
    )
  then
    raise exception using errcode = '22023', message = 'Quote finance selections are invalid.';
  end if;

  if pg_catalog.jsonb_typeof(p_quote_result) is distinct from 'object'
    or p_quote_result -> 'isViable' is distinct from 'true'::jsonb
    or pg_catalog.jsonb_typeof(p_quote_result -> 'recommendedTier') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_quote_result -> 'warnings') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_quote_result -> 'explanation') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_quote_result -> 'finance') is distinct from 'object'
  then
    raise exception using errcode = '22023', message = 'Only a complete, viable quote result can be saved.';
  end if;

  if pg_catalog.octet_length(p_quote_result::text) > 2097152 then
    raise exception using errcode = '22023', message = 'Quote result is too large.';
  end if;

  if pg_catalog.jsonb_array_length(p_quote_result -> 'warnings') > 100
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_quote_result -> 'warnings') as warning(value)
      where pg_catalog.jsonb_typeof(warning.value) is distinct from 'string'
    )
  then
    raise exception using errcode = '22023', message = 'Quote warnings are invalid.';
  end if;

  if pg_catalog.jsonb_array_length(p_quote_result -> 'explanation') > 200
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_quote_result -> 'explanation') as explanation(value)
      where pg_catalog.jsonb_typeof(explanation.value) is distinct from 'object'
    )
  then
    raise exception using errcode = '22023', message = 'Quote explanations are invalid.';
  end if;

  if pg_catalog.jsonb_typeof(p_bom_snapshot) is distinct from 'object'
    or pg_catalog.octet_length(p_bom_snapshot::text) > 1048576
  then
    raise exception using errcode = '22023', message = 'BOM snapshot must be a JSON object within the size limit.';
  end if;

  if pg_catalog.jsonb_typeof(p_finance_snapshot) is distinct from 'object'
    or pg_catalog.octet_length(p_finance_snapshot::text) > 524288
  then
    raise exception using errcode = '22023', message = 'Finance snapshot must be a JSON object within the size limit.';
  end if;

  if (
    pg_catalog.octet_length(p_quote_input::text)
    + pg_catalog.octet_length(p_quote_result::text)
    + pg_catalog.octet_length(p_bom_snapshot::text)
    + pg_catalog.octet_length(p_finance_snapshot::text)
  ) > 3145728
  then
    raise exception using errcode = '22023', message = 'Combined quote snapshots are too large.';
  end if;

  begin
    v_selected_tier_id := nullif(pg_catalog.btrim(p_quote_result #>> '{recommendedTier,id}'), '');
    v_system_size_wp := nullif(p_quote_result ->> 'quotedSystemSizeWp', '')::numeric;
    v_sell_price_thb := nullif(p_quote_result ->> 'suggestedSellPriceTHB', '')::numeric;
    v_finance_adjusted_price_thb :=
      nullif(p_quote_result #>> '{finance,financeAdjustedPriceTHB}', '')::numeric;
    v_annual_generation_kwh := nullif(p_quote_result ->> 'annualGenerationKWh', '')::numeric;
    v_payback_years := nullif(p_quote_result ->> 'paybackYears', '')::numeric;
    v_irr_percent := nullif(p_quote_result ->> 'irrPercent', '')::numeric;
    v_hardware_cost_thb := nullif(p_quote_result ->> 'hardwareCostTHB', '')::numeric;
    v_monthly_payment_thb := nullif(p_quote_result #>> '{finance,monthlyPaymentTHB}', '')::numeric;
    v_down_payment_thb := nullif(p_quote_result #>> '{finance,downPaymentTHB}', '')::numeric;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception using errcode = '22023', message = 'Quote result contains an invalid numeric value.';
  end;

  if v_selected_tier_id is null or pg_catalog.char_length(v_selected_tier_id) > 80 then
    raise exception using errcode = '22023', message = 'Selected quote tier is invalid.';
  end if;

  if v_system_size_wp is null or v_system_size_wp <= 0 or v_system_size_wp > 9999999999.99 then
    raise exception using errcode = '22023', message = 'Quoted system size is outside the valid range.';
  end if;

  if v_sell_price_thb is null or v_sell_price_thb <= 0 or v_sell_price_thb > 999999999999.99 then
    raise exception using errcode = '22023', message = 'Quote sell price is outside the valid range.';
  end if;

  if v_finance_adjusted_price_thb is null
    or v_finance_adjusted_price_thb < 0
    or v_finance_adjusted_price_thb > 999999999999.99
  then
    raise exception using errcode = '22023', message = 'Finance-adjusted price is outside the valid range.';
  end if;

  if v_annual_generation_kwh is null
    or v_annual_generation_kwh < 0
    or v_annual_generation_kwh > 999999999999.99
  then
    raise exception using errcode = '22023', message = 'Annual generation is outside the valid range.';
  end if;

  if v_hardware_cost_thb is null
    or v_hardware_cost_thb < 0
    or v_hardware_cost_thb > 999999999999.99
  then
    raise exception using errcode = '22023', message = 'Hardware cost is outside the valid range.';
  end if;

  if v_payback_years is not null and (v_payback_years < 0 or v_payback_years > 999999.99) then
    raise exception using errcode = '22023', message = 'Payback period is outside the valid range.';
  end if;

  if v_irr_percent is not null and (v_irr_percent < -9999.9999 or v_irr_percent > 9999.9999) then
    raise exception using errcode = '22023', message = 'IRR is outside the valid range.';
  end if;

  if v_monthly_payment_thb is not null
    and (v_monthly_payment_thb < 0 or v_monthly_payment_thb > 999999999999.99)
  then
    raise exception using errcode = '22023', message = 'Monthly payment is outside the valid range.';
  end if;

  if v_down_payment_thb is null
    or v_down_payment_thb < 0
    or v_down_payment_thb > 999999999999.99
  then
    raise exception using errcode = '22023', message = 'Down payment is outside the valid range.';
  end if;

  select coalesce(
    pg_catalog.array_agg(warning.value order by warning.ordinality),
    '{}'::text[]
  )
  into v_warnings
  from pg_catalog.jsonb_array_elements_text(p_quote_result -> 'warnings')
    with ordinality as warning(value, ordinality);

  if p_quote_project_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(p_quote_project_id::text, 1)
    );

    select
      project.id,
      project.created_at,
      project.site_id,
      project.opportunity_id
    into
      v_project_id,
      v_project_created_at,
      v_project_site_id,
      v_project_opportunity_id
    from public.quote_projects as project
    where project.id = p_quote_project_id
      and project.customer_id = p_customer_id
      and project.owner_user_id = v_user_id
      and project.org_id is not distinct from v_org_id
    for update;

    v_existing_project := found;

    if not v_existing_project and exists (
      select 1
      from public.quote_projects as project
      where project.id = p_quote_project_id
    ) then
      raise exception using
        errcode = '42501',
        message = 'The requested quote project id is unavailable.';
    end if;
  end if;

  if not v_existing_project then
    v_project_id := coalesce(p_quote_project_id, pg_catalog.gen_random_uuid());
    v_project_opportunity_id := p_opportunity_id;

    if v_project_opportunity_id is not null then
      select opportunity.site_id
      into v_opportunity_site_id
      from public.opportunities as opportunity
      where opportunity.id = v_project_opportunity_id
        and opportunity.customer_id = p_customer_id
        and opportunity.owner_user_id = v_user_id
        and opportunity.org_id is not distinct from v_org_id
      for share;

      if not found then
        raise exception using
          errcode = '42501',
          message = 'The selected opportunity does not belong to this customer and sales account.';
      end if;
    end if;

    if p_site_id is not null then
      select site.id
      into v_project_site_id
      from public.customer_sites as site
      where site.id = p_site_id
        and site.customer_id = p_customer_id
        and site.owner_user_id = v_user_id
        and site.org_id is not distinct from v_org_id
      for share;

      if not found then
        raise exception using
          errcode = '42501',
          message = 'The selected site does not belong to this customer and sales account.';
      end if;
    elsif v_opportunity_site_id is not null then
      v_project_site_id := v_opportunity_site_id;
    else
      select site.id
      into v_project_site_id
      from public.customer_sites as site
      where site.customer_id = p_customer_id
        and site.owner_user_id = v_user_id
        and site.org_id is not distinct from v_org_id
      order by site.created_at, site.id
      limit 1;
    end if;

    if v_project_site_id is not null
      and v_opportunity_site_id is not null
      and v_project_site_id <> v_opportunity_site_id
    then
      raise exception using errcode = '23514', message = 'Opportunity and quote site do not match.';
    end if;

    if v_title is null then
      v_title := pg_catalog.substr(
        'Solar quote - ' || coalesce(nullif(pg_catalog.btrim(v_customer_name), ''), p_customer_id::text),
        1,
        240
      );
    end if;

    insert into public.quote_projects (
      id,
      org_id,
      customer_id,
      site_id,
      opportunity_id,
      owner_user_id,
      title,
      status
    )
    values (
      v_project_id,
      v_org_id,
      p_customer_id,
      v_project_site_id,
      v_project_opportunity_id,
      v_user_id,
      v_title,
      'draft'
    )
    returning created_at
    into v_project_created_at;

    v_version_no := 1;
  else
    if p_site_id is not null and p_site_id is distinct from v_project_site_id then
      raise exception using errcode = '23514', message = 'The quote project site cannot change between versions.';
    end if;

    if p_opportunity_id is not null
      and p_opportunity_id is distinct from v_project_opportunity_id
    then
      raise exception using errcode = '23514', message = 'The quote project opportunity cannot change between versions.';
    end if;

    if v_project_site_id is not null and not exists (
      select 1
      from public.customer_sites as site
      where site.id = v_project_site_id
        and site.customer_id = p_customer_id
        and site.owner_user_id = v_user_id
        and site.org_id is not distinct from v_org_id
    ) then
      raise exception using errcode = '23514', message = 'The quote project site scope is inconsistent.';
    end if;

    if v_project_opportunity_id is not null and not exists (
      select 1
      from public.opportunities as opportunity
      where opportunity.id = v_project_opportunity_id
        and opportunity.customer_id = p_customer_id
        and opportunity.owner_user_id = v_user_id
        and opportunity.org_id is not distinct from v_org_id
        and (
          v_project_site_id is null
          or opportunity.site_id is null
          or opportunity.site_id = v_project_site_id
        )
    ) then
      raise exception using errcode = '23514', message = 'The quote project opportunity scope is inconsistent.';
    end if;

    select coalesce(pg_catalog.max(version.version_no), 0) + 1
    into v_version_no
    from public.quote_versions as version
    where version.quote_project_id = v_project_id;
  end if;

  v_quote_code :=
    'KS-'
    || pg_catalog.to_char(v_project_created_at at time zone 'Asia/Bangkok', 'YYYYMMDD')
    || '-'
    || pg_catalog.upper(
      pg_catalog.substr(pg_catalog.replace(v_project_id::text, '-', ''), 1, 16)
    )
    || '-V'
    || pg_catalog.lpad(v_version_no::text, 3, '0');

  v_google_solar_summary := pg_catalog.jsonb_strip_nulls(
    pg_catalog.jsonb_build_object(
      'matchedRoof', p_quote_input -> 'googleMatchedRoof',
      'sellableFitWp', p_quote_input -> 'googleSellableFitWp',
      'sellablePanelCount', p_quote_input -> 'googleSellablePanelCount',
      'annualGenerationKWh', p_quote_input -> 'googleAnnualGenerationKWh'
    )
  );

  if v_google_solar_summary = '{}'::jsonb then
    v_google_solar_summary := null;
  end if;

  insert into public.quote_versions (
    id,
    org_id,
    quote_project_id,
    customer_id,
    owner_user_id,
    version_no,
    quote_code,
    selected_tier_id,
    system_size_wp,
    sell_price_thb,
    finance_adjusted_price_thb,
    annual_generation_kwh,
    payback_years,
    irr_percent,
    status,
    created_by
  )
  values (
    v_version_id,
    v_org_id,
    v_project_id,
    p_customer_id,
    v_user_id,
    v_version_no,
    v_quote_code,
    v_selected_tier_id,
    v_system_size_wp,
    v_sell_price_thb,
    v_finance_adjusted_price_thb,
    v_annual_generation_kwh,
    v_payback_years,
    v_irr_percent,
    'draft',
    v_user_id
  );

  insert into public.quote_inputs (
    org_id,
    quote_version_id,
    owner_user_id,
    map_selection,
    quote_input,
    google_solar_summary
  )
  values (
    v_org_id,
    v_version_id,
    v_user_id,
    p_quote_input -> 'map',
    p_quote_input,
    v_google_solar_summary
  );

  insert into public.quote_outputs (
    org_id,
    quote_version_id,
    owner_user_id,
    quote_result,
    explanation,
    warnings
  )
  values (
    v_org_id,
    v_version_id,
    v_user_id,
    p_quote_result,
    p_quote_result -> 'explanation',
    v_warnings
  );

  insert into public.bom_snapshots (
    org_id,
    quote_version_id,
    owner_user_id,
    bom_snapshot,
    hardware_cost_thb
  )
  values (
    v_org_id,
    v_version_id,
    v_user_id,
    p_bom_snapshot,
    v_hardware_cost_thb
  );

  insert into public.finance_scenarios (
    org_id,
    quote_version_id,
    owner_user_id,
    finance_snapshot,
    monthly_payment_thb,
    down_payment_thb
  )
  values (
    v_org_id,
    v_version_id,
    v_user_id,
    p_finance_snapshot,
    v_monthly_payment_thb,
    v_down_payment_thb
  );

  insert into public.activity_logs (
    org_id,
    actor_user_id,
    customer_id,
    quote_project_id,
    event_type,
    event_payload
  )
  values (
    v_org_id,
    v_user_id,
    p_customer_id,
    v_project_id,
    case when v_version_no = 1 then 'quote.created' else 'quote.version_created' end,
    pg_catalog.jsonb_build_object(
      'quoteProjectId', v_project_id,
      'quoteVersionId', v_version_id,
      'quoteCode', v_quote_code,
      'versionNo', v_version_no
    )
  );

  return query
  select v_project_id, v_version_id, v_quote_code;
end;
$function$;

revoke all on function public.save_quote_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.save_quote_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) to service_role;

revoke insert, update, delete on public.quote_projects from authenticated;
revoke insert, update, delete on public.quote_versions from authenticated;
revoke insert, update, delete on public.quote_inputs from authenticated;
revoke insert, update, delete on public.quote_outputs from authenticated;
revoke insert, update, delete on public.bom_snapshots from authenticated;
revoke insert, update, delete on public.finance_scenarios from authenticated;

do $permission_checks$
declare
  function_signature text :=
    'public.save_quote_atomic(uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb)';
  table_name text;
begin
  if pg_catalog.has_function_privilege('anon', function_signature, 'execute')
    or pg_catalog.has_function_privilege('authenticated', function_signature, 'execute')
  then
    raise exception 'Quote save RPC must not be executable outside the service role.';
  end if;

  if not pg_catalog.has_function_privilege('service_role', function_signature, 'execute') then
    raise exception 'Quote save RPC must be executable by the service role.';
  end if;

  if pg_catalog.has_table_privilege('authenticated', 'public.quote_projects', 'insert')
    or pg_catalog.has_table_privilege('authenticated', 'public.quote_projects', 'update')
    or pg_catalog.has_table_privilege('authenticated', 'public.quote_projects', 'delete')
  then
    raise exception 'Authenticated users must not write quote projects directly.';
  end if;

  foreach table_name in array array[
    'quote_versions',
    'quote_inputs',
    'quote_outputs',
    'bom_snapshots',
    'finance_scenarios'
  ]
  loop
    if pg_catalog.has_table_privilege('authenticated', 'public.' || table_name, 'insert')
      or pg_catalog.has_table_privilege('authenticated', 'public.' || table_name, 'update')
      or pg_catalog.has_table_privilege('authenticated', 'public.' || table_name, 'delete')
    then
      raise exception 'Authenticated users retain direct write privileges on public.%', table_name;
    end if;
  end loop;
end;
$permission_checks$;

comment on function public.save_quote_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) is 'Service-only function that atomically creates or versions a sales-owned quote project and persists immutable input, output, BOM, and finance snapshots for a verified actor.';

create or replace function public.ksolar_enforce_quote_snapshot_immutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'UPDATE'
    and tg_table_name = 'quote_versions'
    and (pg_catalog.to_jsonb(new) - 'status') = (pg_catalog.to_jsonb(old) - 'status')
  then
    return new;
  end if;

  raise exception using
    errcode = '55000',
    message = 'Saved quote versions and snapshots are immutable; create a new version instead.';
end;
$function$;

revoke all on function public.ksolar_enforce_quote_snapshot_immutability()
from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'quote_versions',
    'quote_inputs',
    'quote_outputs',
    'bom_snapshots',
    'finance_scenarios'
  ]
  loop
    execute pg_catalog.format(
      'drop trigger if exists ksolar_enforce_quote_snapshot_immutability on public.%I',
      table_name
    );
    execute pg_catalog.format(
      'create trigger ksolar_enforce_quote_snapshot_immutability before update or delete on public.%I for each row execute function public.ksolar_enforce_quote_snapshot_immutability()',
      table_name
    );
  end loop;
end $$;

create or replace function public.ksolar_protect_versioned_quote_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_has_versions boolean;
begin
  select exists (
    select 1
    from public.quote_versions as version
    where version.quote_project_id = old.id
  ) into v_has_versions;

  if not v_has_versions then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception using
      errcode = '55000',
      message = 'A quote project with saved versions cannot be deleted.';
  end if;

  if new.org_id is distinct from old.org_id
    or new.customer_id is distinct from old.customer_id
    or new.site_id is distinct from old.site_id
    or new.opportunity_id is distinct from old.opportunity_id
    or new.owner_user_id is distinct from old.owner_user_id
  then
    raise exception using
      errcode = '55000',
      message = 'A versioned quote project cannot change customer, site, opportunity, owner, or organization.';
  end if;

  return new;
end;
$function$;

revoke all on function public.ksolar_protect_versioned_quote_project()
from public, anon, authenticated;

drop trigger if exists ksolar_protect_versioned_quote_project on public.quote_projects;
create trigger ksolar_protect_versioned_quote_project
before update or delete on public.quote_projects
for each row execute function public.ksolar_protect_versioned_quote_project();
