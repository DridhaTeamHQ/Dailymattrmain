create table if not exists public.admin_settings (
  id integer primary key check (id = 1),
  email text not null,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.admin_settings enable row level security;
