-- Structured customer intake fields for future scoring, ROI calibration, and AI follow-up.

alter table public.customers
  add column if not exists age integer check (age is null or (age between 1 and 120)),
  add column if not exists annual_income_thb numeric(14,2),
  add column if not exists education_background text,
  add column if not exists customer_factors jsonb not null default '{}'::jsonb;

alter table public.household_power_profiles
  add column if not exists annual_electricity_spend_thb numeric(14,2);
