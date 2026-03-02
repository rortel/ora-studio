-- ============================================
-- ORA STUDIO — Supabase Schema (complet)
-- Run this in the Supabase SQL editor
-- ============================================

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  credits integer not null default 100,
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generations history table
create table if not exists public.generations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('text', 'code', 'image', 'video', 'chat')),
  prompt text not null,
  result text,
  model text,
  credits_used integer not null default 1,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

-- Brand vaults
create table if not exists public.brand_vaults (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  brand_name text,
  website_url text,
  guidelines jsonb,
  sources text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Campaigns
create table if not exists public.campaigns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  vault_id uuid references public.brand_vaults(id) on delete set null,
  name text not null,
  brief text not null,
  product_url text,
  assets jsonb default '[]',
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.generations enable row level security;
alter table public.brand_vaults enable row level security;
alter table public.campaigns enable row level security;

-- Profiles RLS
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Generations RLS
create policy "Users can read own generations"
  on public.generations for select using (auth.uid() = user_id);
create policy "Users can insert own generations"
  on public.generations for insert with check (auth.uid() = user_id);

-- Brand vaults RLS
create policy "Users can manage own vaults"
  on public.brand_vaults for all using (auth.uid() = user_id);

-- Campaigns RLS
create policy "Users can manage own campaigns"
  on public.campaigns for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, credits, role)
  values (new.id, new.email, 100, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Atomic credit deduction (prevents race conditions)
create or replace function public.deduct_credits(p_user_id uuid, p_amount integer)
returns integer as $$
declare
  current_credits integer;
begin
  select credits into current_credits
  from public.profiles
  where id = p_user_id
  for update;

  if current_credits is null then
    raise exception 'Profile not found';
  end if;

  if current_credits < p_amount then
    raise exception 'Insufficient credits';
  end if;

  update public.profiles
  set credits = credits - p_amount, updated_at = now()
  where id = p_user_id;

  return current_credits - p_amount;
end;
$$ language plpgsql security definer;

-- ── MIGRATION : add role column if table already exists ──────────────────────
-- alter table public.profiles add column if not exists role text not null default 'client'
--   check (role in ('client', 'admin'));
-- alter table public.profiles drop constraint if exists profiles_role_check;
-- alter table public.profiles add constraint profiles_role_check check (role in ('client', 'admin'));
