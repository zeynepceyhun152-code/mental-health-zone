-- The Mental Health Zone: Rep Portal database
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Running it again is safe.

-- ---------- Tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  instagram text,
  school text,
  city text,
  country text,
  timezone text,
  club_name text,
  school_instagram text,
  agreed_handbook boolean default false,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  rep_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  event_date date,
  type text default 'School event',
  status text default 'Planning',
  created_at timestamptz default now()
);

create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  rep_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  done boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  title text not null,
  body text,
  created_at timestamptz default now()
);

create table if not exists public.event_reports (
  id bigint generated always as identity primary key,
  rep_id uuid references public.profiles(id) on delete cascade default auth.uid(),
  event_name text not null,
  event_date date,
  attendees int,
  instagram_url text,
  notes text,
  created_at timestamptz default now()
);

-- Private settings only signed-in reps can read (your email and Drive link stay off the public site)
create table if not exists public.settings (
  key text primary key,
  value text
);

-- ---------- Helper ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Reps can't make themselves admin
create or replace function public.protect_admin_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null when you run SQL yourself in the dashboard, so you can still make yourself admin there
  if new.is_admin is distinct from coalesce(old.is_admin, false) and auth.uid() is not null and not public.is_admin() then
    new.is_admin := coalesce(old.is_admin, false);
  end if;
  return new;
end $$;
drop trigger if exists protect_admin_flag on public.profiles;
create trigger protect_admin_flag before insert or update on public.profiles
for each row execute function public.protect_admin_flag();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.announcements enable row level security;
alter table public.event_reports enable row level security;
alter table public.settings enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "events: read own or admin" on public.events;
create policy "events: read own or admin" on public.events for select to authenticated using (rep_id = auth.uid() or public.is_admin());
drop policy if exists "events: admin writes" on public.events;
create policy "events: admin writes" on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tasks: read own or admin" on public.tasks;
create policy "tasks: read own or admin" on public.tasks for select to authenticated using (rep_id = auth.uid() or public.is_admin());
drop policy if exists "tasks: rep ticks own" on public.tasks;
create policy "tasks: rep ticks own" on public.tasks for update to authenticated using (rep_id = auth.uid() or public.is_admin());
drop policy if exists "tasks: admin adds" on public.tasks;
create policy "tasks: admin adds" on public.tasks for insert to authenticated with check (public.is_admin());
drop policy if exists "tasks: admin deletes" on public.tasks;
create policy "tasks: admin deletes" on public.tasks for delete to authenticated using (public.is_admin());

drop policy if exists "announcements: reps read" on public.announcements;
create policy "announcements: reps read" on public.announcements for select to authenticated using (true);
drop policy if exists "announcements: admin writes" on public.announcements;
create policy "announcements: admin writes" on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reports: rep adds own" on public.event_reports;
create policy "reports: rep adds own" on public.event_reports for insert to authenticated with check (rep_id = auth.uid());
drop policy if exists "reports: read own or admin" on public.event_reports;
create policy "reports: read own or admin" on public.event_reports for select to authenticated using (rep_id = auth.uid() or public.is_admin());

drop policy if exists "settings: reps read" on public.settings;
create policy "settings: reps read" on public.settings for select to authenticated using (true);
drop policy if exists "settings: admin writes" on public.settings;
create policy "settings: admin writes" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Reps only change done/undone on their tasks, not the title
revoke update on public.tasks from authenticated;
grant update (done) on public.tasks to authenticated;
grant update on public.tasks to service_role;

-- ---------- Private settings ----------
insert into public.settings (key, value) values
  ('report_email', 'zceyhun28@tcs.org'),
  ('drive_url', 'https://drive.google.com/drive/folders/1AKMYAlxx91NhtWCs_SlzWZgH1od4MPGA?usp=share_link')
on conflict (key) do update set value = excluded.value;
