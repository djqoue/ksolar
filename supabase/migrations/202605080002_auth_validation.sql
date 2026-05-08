-- Auth validation helpers for KSolar sales accounts.

create unique index if not exists sales_profiles_primary_email_unique_idx
  on public.sales_profiles (lower(primary_email::text))
  where primary_email is not null;

create unique index if not exists sales_profiles_primary_phone_unique_idx
  on public.sales_profiles (primary_phone)
  where primary_phone is not null and length(primary_phone) > 0;

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
    lower(new.email),
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.email, new.phone)
  )
  on conflict (id) do update
  set
    primary_email = excluded.primary_email,
    primary_phone = excluded.primary_phone,
    display_name = excluded.display_name,
    updated_at = now();

  return new;
end;
$$;

create or replace function public.check_sales_identifier_available(
  requested_email text,
  requested_phone text default null
)
returns table (
  email_available boolean,
  phone_available boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    requested_email is null
      or not exists (
        select 1
        from public.sales_profiles profile
        where lower(profile.primary_email::text) = lower(requested_email)
      ) as email_available,
    requested_phone is null
      or requested_phone = ''
      or not exists (
        select 1
        from public.sales_profiles profile
        where profile.primary_phone = requested_phone
      ) as phone_available;
$$;

grant execute on function public.check_sales_identifier_available(text, text) to anon, authenticated;
