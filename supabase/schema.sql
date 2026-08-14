-- Run this in the Supabase SQL editor (once per project).
-- Then create the first admin: npm run seed:admin

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists unique_profile_username_lower
  on public.profiles (lower(username));

create table if not exists public.seminarians (
  id integer generated always as identity primary key,
  first_name text not null,
  last_name text not null,
  birthdate date not null,
  address text not null default '',
  is_adventist boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create unique index if not exists unique_seminarian_full_name
  on public.seminarians (lower(first_name), lower(last_name));

create table if not exists public.seminars (
  id integer generated always as identity primary key,
  title text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint seminar_dates_ok check (end_date >= start_date)
);

create table if not exists public.attendance (
  id integer generated always as identity primary key,
  seminar_id integer not null references public.seminars (id) on delete cascade,
  seminarian_id integer not null references public.seminarians (id) on delete cascade,
  date date not null,
  status text not null default 'present' check (status in ('present', 'absent')),
  marked_at timestamptz not null default now(),
  marked_by uuid references public.profiles (id) on delete set null,
  unique (seminar_id, seminarian_id, date)
);

create index if not exists attendance_seminar_date_idx
  on public.attendance (seminar_id, date);

alter table public.profiles enable row level security;
alter table public.seminarians enable row level security;
alter table public.seminars enable row level security;
alter table public.attendance enable row level security;

-- API uses the service role (bypasses RLS). Policies below cover any direct client use.
create policy "authenticated read profiles"
  on public.profiles for select to authenticated using (true);

create policy "authenticated read seminarians"
  on public.seminarians for select to authenticated using (true);

create policy "authenticated read seminars"
  on public.seminars for select to authenticated using (true);

create policy "authenticated read attendance"
  on public.attendance for select to authenticated using (true);
