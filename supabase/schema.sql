-- ============================================
-- ORA STUDIO — Supabase Schema (complet v2)
-- Run this in the Supabase SQL editor
-- ============================================

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  credits integer not null default 50,
  plan text not null default 'trial' check (plan in ('trial', 'generate', 'studio')),
  plan_expires_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  role text not null default 'client' check (role in ('client', 'admin')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generations history table
create table if not exists public.generations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('text', 'code', 'image', 'video', 'audio', 'chat', 'compare')),
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
  logo_url text,
  website_url text,
  expertise text,
  mission text,
  usp text,
  tone_config jsonb default '{"tone":"professionnel","formality":3,"style":"direct"}',
  palette jsonb default '{"primary":[],"secondary":[],"neutral":[]}',
  typography jsonb default '{"heading":"Inter","body":"Inter"}',
  personas jsonb default '[]',
  guidelines jsonb,
  sources text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Brand products/services (1 inclus Studio, +500 cr par produit supp.)
create table if not exists public.brand_products (
  id uuid default gen_random_uuid() primary key,
  vault_id uuid references public.brand_vaults(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  benefits text[],
  objections text[],
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Canvas projects (Table de montage)
create table if not exists public.canvas_projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Sans titre',
  canvas_data jsonb default '{}',
  ratio text not null default '16:9' check (ratio in ('16:9','9:16','1:1','4:5')),
  width integer not null default 1920,
  height integer not null default 1080,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Credit transactions log
create table if not exists public.credit_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount integer not null,
  type text not null check (type in ('trial','subscription','purchase','usage','product_add')),
  description text,
  stripe_payment_id text,
  created_at timestamptz not null default now()
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
alter table public.brand_products enable row level security;
alter table public.canvas_projects enable row level security;
alter table public.credit_transactions enable row level security;
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

-- Brand products RLS
create policy "Users can manage own products"
  on public.brand_products for all using (auth.uid() = user_id);

-- Canvas projects RLS
create policy "Users can manage own canvas projects"
  on public.canvas_projects for all using (auth.uid() = user_id);

-- Credit transactions RLS
create policy "Users can read own transactions"
  on public.credit_transactions for select using (auth.uid() = user_id);

-- Campaigns RLS
create policy "Users can manage own campaigns"
  on public.campaigns for all using (auth.uid() = user_id);

-- Auto-create profile on signup (50 crédits trial)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, credits, plan, role)
  values (new.id, new.email, 50, 'trial', 'client')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Atomic credit deduction
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

-- Add credits
create or replace function public.add_credits(p_user_id uuid, p_amount integer)
returns integer as $$
declare
  new_credits integer;
begin
  update public.profiles
  set credits = credits + p_amount, updated_at = now()
  where id = p_user_id
  returning credits into new_credits;

  return new_credits;
end;
$$ language plpgsql security definer;

-- ── MIGRATIONS (run only if tables already exist) ────────────────────────────
-- alter table public.profiles add column if not exists plan text not null default 'trial';
-- alter table public.profiles add column if not exists plan_expires_at timestamptz;
-- alter table public.profiles add column if not exists stripe_customer_id text;
-- alter table public.profiles add column if not exists stripe_subscription_id text;
-- alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
-- update public.profiles set plan = 'trial' where plan is null;
