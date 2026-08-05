-- Stores every submission from the /support help form.
-- Already applied to project hntlruqdlonpsoraxydk; kept here as the record.
create table if not exists public.support_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(trim(name)) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 254),
  topic       text not null check (char_length(topic) between 1 and 80),
  message     text not null check (char_length(trim(message)) between 1 and 5000)
);

create index if not exists support_requests_created_at_idx
  on public.support_requests (created_at desc);

alter table public.support_requests enable row level security;

-- The site ships an anon publishable key, so anon may only ever write.
-- No select/update/delete policy exists, which means submissions are
-- write-only from the browser and readable solely from the dashboard or
-- with a secret service-role key.
drop policy if exists "anon can submit support requests" on public.support_requests;
create policy "anon can submit support requests"
  on public.support_requests
  for insert
  to anon, authenticated
  with check (true);
