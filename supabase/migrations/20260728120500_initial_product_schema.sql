-- Wanderfound V0 product data.
-- Every player signs in with Google and owns rows through auth.uid().

create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.adventure_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'setup' check (
    status in ('setup', 'generating', 'active', 'completed', 'abandoned', 'expired')
  ),
  start_lat double precision check (start_lat is null or start_lat between -90 and 90),
  start_lng double precision check (start_lng is null or start_lng between -180 and 180),
  duration_minutes smallint check (duration_minutes is null or duration_minutes in (30, 60)),
  mood text check (
    mood is null or mood in ('historical', 'culinary', 'strange', 'beautiful')
  ),
  party_type text check (
    party_type is null or party_type in ('solo', 'couple_friends', 'family')
  ),
  trail_json jsonb,
  route_json jsonb,
  generation_model text,
  prompt_version text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '24 hours'),
  check (expires_at > created_at)
);

create table public.stage_progress (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.adventure_sessions(id) on delete cascade,
  stage_index smallint not null check (stage_index between 1 and 5),
  status text not null default 'locked' check (
    status in ('locked', 'active', 'completed', 'skipped')
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  verification_result_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (session_id, stage_index)
);

create table public.verification_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.adventure_sessions(id) on delete cascade,
  stage_index smallint not null check (stage_index between 1 and 5),
  photo_storage_path text,
  capture_lat double precision check (capture_lat is null or capture_lat between -90 and 90),
  capture_lng double precision check (capture_lng is null or capture_lng between -180 and 180),
  location_accuracy_m double precision check (
    location_accuracy_m is null or location_accuracy_m >= 0
  ),
  visual_confidence double precision check (
    visual_confidence is null or visual_confidence between 0 and 1
  ),
  gps_distance_m double precision check (gps_distance_m is null or gps_distance_m >= 0),
  decision text check (
    decision is null or decision in ('passed', 'failed', 'inconclusive')
  ),
  reason_code text,
  model_version text,
  created_at timestamptz not null default timezone('utc', now()),
  delete_after timestamptz not null default (timezone('utc', now()) + interval '24 hours')
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.adventure_sessions(id) on delete restrict,
  provider text not null check (provider in ('razorpay')),
  provider_order_id text not null,
  provider_payment_id text,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'created' check (
    status in ('created', 'authorized', 'paid', 'failed', 'refunded')
  ),
  signature_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_order_id),
  unique (provider, provider_payment_id)
);

create table public.stage_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.adventure_sessions(id) on delete cascade,
  stage_index smallint not null check (stage_index between 1 and 5),
  report_type text not null check (
    report_type in (
      'unsafe',
      'closed',
      'inaccessible',
      'incorrect',
      'uncomfortable',
      'other'
    )
  ),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default timezone('utc', now())
);

create index adventure_sessions_user_created_idx
  on public.adventure_sessions (user_id, created_at desc);
create index adventure_sessions_expiry_idx
  on public.adventure_sessions (expires_at);
create index stage_progress_session_idx on public.stage_progress (session_id);
create index verification_attempts_session_idx
  on public.verification_attempts (session_id, stage_index);
create index verification_attempts_delete_idx
  on public.verification_attempts (delete_after);
create index payments_session_idx on public.payments (session_id);
create index stage_reports_session_idx on public.stage_reports (session_id, stage_index);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger adventure_sessions_set_updated_at
before update on public.adventure_sessions
for each row execute function public.set_updated_at();

create trigger stage_progress_set_updated_at
before update on public.stage_progress
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create or replace function public.sync_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (user_id) do update
  set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

create trigger auth_user_profile_sync
after insert or update of raw_user_meta_data on auth.users
for each row execute function public.sync_auth_profile();

create or replace function public.owns_adventure_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.adventure_sessions
    where id = target_session_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_adventure_session(uuid) from public;
grant execute on function public.owns_adventure_session(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.adventure_sessions enable row level security;
alter table public.stage_progress enable row level security;
alter table public.verification_attempts enable row level security;
alter table public.payments enable row level security;
alter table public.stage_reports enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (user_id = (select auth.uid()));

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "adventure_sessions_select_own"
on public.adventure_sessions for select
to authenticated
using (user_id = (select auth.uid()));

create policy "stage_progress_select_owned"
on public.stage_progress for select
to authenticated
using (public.owns_adventure_session(session_id));

create policy "verification_attempts_select_owned"
on public.verification_attempts for select
to authenticated
using (public.owns_adventure_session(session_id));

create policy "payments_select_owned"
on public.payments for select
to authenticated
using (public.owns_adventure_session(session_id));

create policy "stage_reports_select_owned"
on public.stage_reports for select
to authenticated
using (public.owns_adventure_session(session_id));

create policy "stage_reports_insert_owned"
on public.stage_reports for insert
to authenticated
with check (public.owns_adventure_session(session_id));

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.adventure_sessions from anon, authenticated;
revoke all on table public.stage_progress from anon, authenticated;
revoke all on table public.verification_attempts from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.stage_reports from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url) on table public.profiles to authenticated;
grant select on table public.adventure_sessions to authenticated;
grant select on table public.stage_progress to authenticated;
grant select on table public.verification_attempts to authenticated;
grant select on table public.payments to authenticated;
grant select on table public.stage_reports to authenticated;
grant insert (session_id, stage_index, report_type, comment)
  on table public.stage_reports to authenticated;
