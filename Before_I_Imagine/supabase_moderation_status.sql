-- Run this once in the Supabase SQL Editor before deploying the moderation code.
-- Historical rows intentionally remain NULL and are treated as approved by the
-- public API. New rows default to pending until server-side moderation finishes.

alter table public.drawings
  add column if not exists moderation_status text;

alter table public.drawings
  alter column moderation_status set default 'pending';

alter table public.drawings
  drop constraint if exists drawings_moderation_status_check;

alter table public.drawings
  add constraint drawings_moderation_status_check
  check (
    moderation_status is null
    or moderation_status in ('pending', 'approved', 'rejected')
  );
