-- Keep trigger and event-trigger helpers out of the public PostgREST surface.
-- They continue to run through their database triggers; callers never need to
-- invoke them directly.

alter function public.set_updated_at()
  set search_path = pg_catalog;

alter function public.handle_new_sales_user()
  set search_path = '';

revoke all on function public.set_updated_at()
  from public, anon, authenticated;

revoke all on function public.handle_new_sales_user()
  from public, anon, authenticated;

revoke all on function public.rls_auto_enable()
  from public, anon, authenticated;
