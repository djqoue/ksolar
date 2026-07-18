-- Remote migration 20260718064303: atomically create or update the customer intake aggregate.
-- The caller supplies no organization or owner identifiers; both are derived from
-- the authenticated, active sales profile inside this hardened function.

create or replace function public.save_customer_intake_atomic(
  p_customer_id uuid,
  p_display_name text,
  p_primary_phone text,
  p_primary_email text,
  p_line_id text,
  p_address_text text,
  p_latitude double precision,
  p_longitude double precision,
  p_monthly_bill_thb numeric,
  p_annual_electricity_spend_thb numeric,
  p_age integer,
  p_annual_income_thb numeric,
  p_education_background text,
  p_customer_factors jsonb,
  p_appliances jsonb,
  p_notes text,
  p_consent_to_contact boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_org_id uuid;
  v_profile_active boolean;
  v_customer_id uuid;
  v_site_id uuid;
  v_power_profile_id uuid;
  v_is_new boolean := false;
  v_display_name text := nullif(pg_catalog.btrim(p_display_name), '');
  v_primary_phone text := nullif(pg_catalog.btrim(p_primary_phone), '');
  v_primary_email text := nullif(pg_catalog.lower(pg_catalog.btrim(p_primary_email)), '');
  v_line_id text := nullif(pg_catalog.btrim(p_line_id), '');
  v_address_text text := nullif(pg_catalog.btrim(p_address_text), '');
  v_education_background text := coalesce(nullif(pg_catalog.btrim(p_education_background), ''), 'unknown');
  v_notes text := nullif(pg_catalog.btrim(p_notes), '');
  v_customer_factors jsonb := coalesce(p_customer_factors, '{}'::jsonb);
  v_appliances jsonb := coalesce(p_appliances, '[]'::jsonb);
  v_appliance jsonb;
  v_quantity integer;
  v_rated_power_w numeric;
  v_estimated_hours_per_day numeric;
  v_inverter_load boolean;
  v_snapshot jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to save a customer.';
  end if;

  select profile.org_id, profile.active
  into v_org_id, v_profile_active
  from public.sales_profiles as profile
  where profile.id = v_user_id
  for share;

  if not found or v_profile_active is not true then
    raise exception using
      errcode = '42501',
      message = 'An active sales profile is required to save a customer.';
  end if;

  if v_display_name is null or pg_catalog.char_length(v_display_name) > 160 then
    raise exception using errcode = '22023', message = 'Customer name is required and must be at most 160 characters.';
  end if;

  if v_address_text is null or pg_catalog.char_length(v_address_text) > 2000 then
    raise exception using errcode = '22023', message = 'Customer address is required and must be at most 2000 characters.';
  end if;

  if v_primary_phone is null and v_primary_email is null and v_line_id is null then
    raise exception using errcode = '22023', message = 'At least one customer contact method is required.';
  end if;

  if p_consent_to_contact is not true then
    raise exception using
      errcode = '22023',
      message = 'Explicit consent is required before saving contact details or precise location.';
  end if;

  if v_primary_phone is not null
    and (
      pg_catalog.char_length(v_primary_phone) > 32
      or v_primary_phone !~ '^\+[1-9][0-9]{7,14}$'
    )
  then
    raise exception using errcode = '22023', message = 'Customer phone number is invalid.';
  end if;

  if v_primary_email is not null
    and (
      pg_catalog.char_length(v_primary_email) > 254
      or v_primary_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  then
    raise exception using errcode = '22023', message = 'Customer email is invalid.';
  end if;

  if v_line_id is not null and pg_catalog.char_length(v_line_id) > 128 then
    raise exception using errcode = '22023', message = 'Customer LINE ID is too long.';
  end if;

  if p_age is not null and (p_age < 1 or p_age > 120) then
    raise exception using errcode = '22023', message = 'Customer age must be between 1 and 120.';
  end if;

  if v_education_background not in ('unknown', 'primary', 'secondary', 'vocational', 'bachelor', 'master_plus', 'other') then
    raise exception using errcode = '22023', message = 'Customer education value is invalid.';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception using errcode = '22023', message = 'Latitude and longitude must be provided together.';
  end if;

  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then
    raise exception using errcode = '22023', message = 'Latitude is outside the valid range.';
  end if;

  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then
    raise exception using errcode = '22023', message = 'Longitude is outside the valid range.';
  end if;

  if p_monthly_bill_thb is not null
    and (p_monthly_bill_thb < 0 or p_monthly_bill_thb > 9999999999.99)
  then
    raise exception using errcode = '22023', message = 'Monthly electricity bill is outside the valid range.';
  end if;

  if p_annual_electricity_spend_thb is not null
    and (p_annual_electricity_spend_thb < 0 or p_annual_electricity_spend_thb > 999999999999.99)
  then
    raise exception using errcode = '22023', message = 'Annual electricity spend is outside the valid range.';
  end if;

  if p_annual_income_thb is not null
    and (p_annual_income_thb < 0 or p_annual_income_thb > 999999999999.99)
  then
    raise exception using errcode = '22023', message = 'Annual income is outside the valid range.';
  end if;

  if v_notes is not null and pg_catalog.char_length(v_notes) > 10000 then
    raise exception using errcode = '22023', message = 'Customer notes are too long.';
  end if;

  if pg_catalog.jsonb_typeof(v_customer_factors) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Customer factors must be a JSON object.';
  end if;

  if pg_catalog.jsonb_typeof(v_appliances) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Appliances must be a JSON array.';
  end if;

  if pg_catalog.jsonb_array_length(v_appliances) > 50 then
    raise exception using errcode = '22023', message = 'Appliances must be a JSON array with at most 50 entries.';
  end if;

  for v_appliance in
    select appliance.value
    from pg_catalog.jsonb_array_elements(v_appliances) as appliance(value)
  loop
    if pg_catalog.jsonb_typeof(v_appliance) is distinct from 'object'
      or nullif(pg_catalog.btrim(v_appliance ->> 'appliance_type'), '') is null
      or nullif(pg_catalog.btrim(v_appliance ->> 'label'), '') is null
      or pg_catalog.char_length(v_appliance ->> 'appliance_type') > 80
      or pg_catalog.char_length(v_appliance ->> 'label') > 160
    then
      raise exception using errcode = '22023', message = 'Each appliance must have a valid type and label.';
    end if;

    if (v_appliance ->> 'appliance_type') not in ('aircon', 'refrigerator', 'hot_water', 'grow_light', 'ev') then
      raise exception using errcode = '22023', message = 'Appliance type is not supported.';
    end if;

    begin
      v_quantity := (v_appliance ->> 'quantity')::integer;
      v_rated_power_w := nullif(v_appliance ->> 'rated_power_w', '')::numeric;
      v_estimated_hours_per_day := nullif(v_appliance ->> 'estimated_hours_per_day', '')::numeric;
      v_inverter_load := coalesce((v_appliance ->> 'inverter_load')::boolean, false);
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception using errcode = '22023', message = 'Appliance numeric or boolean value is invalid.';
    end;

    if v_quantity is null or v_quantity < 1 or v_quantity > 50 then
      raise exception using errcode = '22023', message = 'Appliance quantity must be between 1 and 50.';
    end if;

    if v_rated_power_w is not null and (v_rated_power_w < 0 or v_rated_power_w > 9999999999.99) then
      raise exception using errcode = '22023', message = 'Appliance rated power is outside the valid range.';
    end if;

    if v_estimated_hours_per_day is not null
      and (v_estimated_hours_per_day < 0 or v_estimated_hours_per_day > 24)
    then
      raise exception using errcode = '22023', message = 'Appliance daily usage must be between 0 and 24 hours.';
    end if;

    if v_inverter_load is null then
      raise exception using errcode = '22023', message = 'Appliance inverter flag is invalid.';
    end if;
  end loop;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(v_appliances) as appliance(value)
    group by appliance.value ->> 'appliance_type'
    having pg_catalog.count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'Duplicate appliance types are not allowed.';
  end if;

  if p_customer_id is null then
    insert into public.customers (
      org_id,
      owner_user_id,
      display_name,
      primary_phone,
      primary_email,
      line_id,
      lead_source,
      status,
      consent_to_contact,
      age,
      annual_income_thb,
      education_background,
      customer_factors
    )
    values (
      v_org_id,
      v_user_id,
      v_display_name,
      v_primary_phone,
      v_primary_email,
      v_line_id,
      'field_quote',
      'lead',
      true,
      p_age,
      p_annual_income_thb,
      v_education_background,
      v_customer_factors
    )
    returning id into v_customer_id;
    v_is_new := true;
  else
    insert into public.customers (
      id,
      org_id,
      owner_user_id,
      display_name,
      primary_phone,
      primary_email,
      line_id,
      lead_source,
      status,
      consent_to_contact,
      age,
      annual_income_thb,
      education_background,
      customer_factors
    )
    values (
      p_customer_id,
      v_org_id,
      v_user_id,
      v_display_name,
      v_primary_phone,
      v_primary_email,
      v_line_id,
      'field_quote',
      'lead',
      true,
      p_age,
      p_annual_income_thb,
      v_education_background,
      v_customer_factors
    )
    on conflict (id) do nothing
    returning id into v_customer_id;

    if v_customer_id is not null then
      v_is_new := true;
    else
      select customer.id
      into v_customer_id
      from public.customers as customer
      where customer.id = p_customer_id
        and customer.owner_user_id = v_user_id
        and customer.org_id is not distinct from v_org_id
      for update;

      if not found then
        raise exception using
          errcode = '42501',
          message = 'This customer cannot be saved by the current sales account.';
      end if;

      update public.customers
      set
        display_name = v_display_name,
        primary_phone = v_primary_phone,
        primary_email = v_primary_email,
        line_id = v_line_id,
        consent_to_contact = true,
        age = p_age,
        annual_income_thb = p_annual_income_thb,
        education_background = v_education_background,
        customer_factors = v_customer_factors
      where id = v_customer_id
        and owner_user_id = v_user_id
        and org_id is not distinct from v_org_id;
    end if;
  end if;

  if exists (
    select 1
    from public.customer_sites as site
    where site.customer_id = v_customer_id
      and (
        site.owner_user_id <> v_user_id
        or site.org_id is distinct from v_org_id
      )
  ) then
    raise exception using errcode = '23514', message = 'Customer site ownership or organization is inconsistent.';
  end if;

  v_site_id := null;

  select site.id
  into v_site_id
  from public.customer_sites as site
  where site.customer_id = v_customer_id
    and site.owner_user_id = v_user_id
    and site.org_id is not distinct from v_org_id
  order by site.created_at, site.id
  limit 1
  for update;

  if v_site_id is null then
    insert into public.customer_sites (
      org_id,
      customer_id,
      owner_user_id,
      site_label,
      address_text,
      latitude,
      longitude,
      utility_provider,
      meter_phase
    )
    values (
      v_org_id,
      v_customer_id,
      v_user_id,
      'Primary',
      v_address_text,
      p_latitude,
      p_longitude,
      'unknown',
      'unknown'
    )
    returning id into v_site_id;
  else
    update public.customer_sites
    set
      address_text = v_address_text,
      latitude = p_latitude,
      longitude = p_longitude
    where id = v_site_id
      and customer_id = v_customer_id
      and owner_user_id = v_user_id
      and org_id is not distinct from v_org_id;
  end if;

  if exists (
    select 1
    from public.household_power_profiles as power_profile
    left join public.customer_sites as profile_site
      on profile_site.id = power_profile.site_id
    where power_profile.customer_id = v_customer_id
      and (
        power_profile.owner_user_id <> v_user_id
        or power_profile.org_id is distinct from v_org_id
        or (
          power_profile.site_id is not null
          and (
            profile_site.id is null
            or profile_site.customer_id <> v_customer_id
            or profile_site.owner_user_id <> v_user_id
            or profile_site.org_id is distinct from v_org_id
          )
        )
      )
  ) then
    raise exception using errcode = '23514', message = 'Power profile parent ownership or organization is inconsistent.';
  end if;

  v_power_profile_id := null;

  select power_profile.id
  into v_power_profile_id
  from public.household_power_profiles as power_profile
  where power_profile.customer_id = v_customer_id
    and power_profile.site_id = v_site_id
    and power_profile.owner_user_id = v_user_id
    and power_profile.org_id is not distinct from v_org_id
  order by power_profile.created_at, power_profile.id
  limit 1
  for update;

  if v_power_profile_id is null then
    insert into public.household_power_profiles (
      org_id,
      customer_id,
      site_id,
      owner_user_id,
      monthly_bill_thb,
      annual_electricity_spend_thb,
      notes
    )
    values (
      v_org_id,
      v_customer_id,
      v_site_id,
      v_user_id,
      p_monthly_bill_thb,
      p_annual_electricity_spend_thb,
      v_notes
    )
    returning id into v_power_profile_id;
  else
    update public.household_power_profiles
    set
      monthly_bill_thb = p_monthly_bill_thb,
      annual_electricity_spend_thb = p_annual_electricity_spend_thb,
      notes = v_notes
    where id = v_power_profile_id
      and customer_id = v_customer_id
      and site_id = v_site_id
      and owner_user_id = v_user_id
      and org_id is not distinct from v_org_id;
  end if;

  if exists (
    select 1
    from public.household_appliances as appliance
    join public.household_power_profiles as appliance_profile
      on appliance_profile.id = appliance.power_profile_id
    where appliance.customer_id = v_customer_id
      and (
        appliance.owner_user_id <> v_user_id
        or appliance.org_id is distinct from v_org_id
        or appliance_profile.customer_id <> v_customer_id
        or appliance_profile.owner_user_id <> v_user_id
        or appliance_profile.org_id is distinct from v_org_id
      )
  ) then
    raise exception using errcode = '23514', message = 'Appliance parent ownership or organization is inconsistent.';
  end if;

  delete from public.household_appliances
  where power_profile_id = v_power_profile_id
    and customer_id = v_customer_id
    and owner_user_id = v_user_id
    and org_id is not distinct from v_org_id;

  insert into public.household_appliances (
    org_id,
    power_profile_id,
    customer_id,
    owner_user_id,
    appliance_type,
    label,
    quantity,
    rated_power_w,
    estimated_hours_per_day,
    inverter_load
  )
  select
    v_org_id,
    v_power_profile_id,
    v_customer_id,
    v_user_id,
    appliance.appliance_type,
    appliance.label,
    appliance.quantity,
    appliance.rated_power_w,
    appliance.estimated_hours_per_day,
    coalesce(appliance.inverter_load, false)
  from pg_catalog.jsonb_to_recordset(v_appliances) as appliance(
    appliance_type text,
    label text,
    quantity integer,
    rated_power_w numeric,
    estimated_hours_per_day numeric,
    inverter_load boolean
  );

  v_snapshot := pg_catalog.jsonb_build_object(
    'displayName', v_display_name,
    'primaryPhone', v_primary_phone,
    'primaryEmail', v_primary_email,
    'lineId', v_line_id,
    'addressText', v_address_text,
    'latitude', p_latitude,
    'longitude', p_longitude,
    'monthlyBillTHB', p_monthly_bill_thb,
    'annualElectricitySpendTHB', p_annual_electricity_spend_thb,
    'age', p_age,
    'annualIncomeTHB', p_annual_income_thb,
    'educationBackground', v_education_background,
    'customerFactors', v_customer_factors,
    'appliances', v_appliances,
    'notes', v_notes,
    'consentToContact', true
  );

  if not exists (
    select 1
    from public.automation_events as queued_event
    where queued_event.org_id is not distinct from v_org_id
      and queued_event.owner_user_id = v_user_id
      and queued_event.aggregate_type = 'customer'
      and queued_event.aggregate_id = v_customer_id
      and queued_event.event_type in ('customer_intake.created', 'customer_intake.updated')
      and queued_event.payload -> 'snapshot' = v_snapshot
  ) then
    insert into public.automation_events (
      org_id,
      owner_user_id,
      source,
      aggregate_type,
      aggregate_id,
      event_type,
      payload
    )
    values (
      v_org_id,
      v_user_id,
      'ksolar',
      'customer',
      v_customer_id,
      case when v_is_new then 'customer_intake.created' else 'customer_intake.updated' end,
      pg_catalog.jsonb_build_object(
        'customerId', v_customer_id,
        'siteId', v_site_id,
        'powerProfileId', v_power_profile_id,
        'source', 'quote_workflow',
        'factorPayload', v_customer_factors,
        'snapshot', v_snapshot
      )
    );
  end if;

  return v_customer_id;
end;
$function$;

revoke all on function public.save_customer_intake_atomic(
  uuid,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision,
  numeric,
  numeric,
  integer,
  numeric,
  text,
  jsonb,
  jsonb,
  text,
  boolean
) from public;

revoke all on function public.save_customer_intake_atomic(
  uuid,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision,
  numeric,
  numeric,
  integer,
  numeric,
  text,
  jsonb,
  jsonb,
  text,
  boolean
) from anon;

grant execute on function public.save_customer_intake_atomic(
  uuid,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision,
  numeric,
  numeric,
  integer,
  numeric,
  text,
  jsonb,
  jsonb,
  text,
  boolean
) to authenticated;

-- All customer intake mutations must pass through the validated, consent-aware,
-- transactional RPC above. Authenticated clients keep read access via RLS.
revoke insert, update, delete on table public.customers from authenticated;
revoke insert, update, delete on table public.customer_sites from authenticated;
revoke insert, update, delete on table public.household_power_profiles from authenticated;
revoke insert, update, delete on table public.household_appliances from authenticated;

comment on function public.save_customer_intake_atomic(
  uuid,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision,
  numeric,
  numeric,
  integer,
  numeric,
  text,
  jsonb,
  jsonb,
  text,
  boolean
) is 'Atomically creates or updates a sales-owned customer intake aggregate after auth, active-profile, consent, input, and parent-organization checks.';
