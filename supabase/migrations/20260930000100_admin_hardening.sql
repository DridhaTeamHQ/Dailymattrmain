-- Apply to the support project (the one holding support_requests), after
-- 20260930000000_create_admin_settings.sql.

-- A settings row may exist only to carry the session version (bumped on
-- logout and password change so older admin cookies stop working) before any
-- password has been set from the dashboard.
alter table public.admin_settings alter column password_hash drop not null;
alter table public.admin_settings add column if not exists session_version integer not null default 0;

-- Failed admin sign-ins, counted per IP to rate-limit password guessing.
-- Only the service-role key used by api/admin.js touches this table.
create table if not exists public.admin_login_attempts (
  id          bigint generated always as identity primary key,
  ip          text not null,
  created_at  timestamptz not null default now()
);
create index if not exists admin_login_attempts_ip_created_at_idx
  on public.admin_login_attempts (ip, created_at desc);
alter table public.admin_login_attempts enable row level security;

-- The browser form only offers these four topics; enforce it for direct
-- PostgREST inserts too. NOT VALID leaves any existing rows untouched.
alter table public.support_requests drop constraint if exists support_requests_topic_allowed;
alter table public.support_requests add constraint support_requests_topic_allowed
  check (topic in ('Account or subscription', 'App feedback', 'Technical issue', 'Something else')) not valid;
