-- 3Bears Kassenbon-Prüftool — production schema
-- Security posture: RLS ON everywhere; config edits admin-only; facts writable by any authed user.
-- Personal data (names, emails from receipts) lives here → project must be in an EU region.

-- ---------------------------------------------------------------------------
-- Users & roles
-- ---------------------------------------------------------------------------
-- Mirror of auth.users we control, to gate admin actions. Populated on first login
-- by the app (upsert) and/or seeded manually for known admins.
create table if not exists public.app_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'member' check (role in ('member','admin')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Helper: is the current caller an active admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- ---------------------------------------------------------------------------
-- Config tables (drive the Claude prompt at runtime — the "self-service training")
-- ---------------------------------------------------------------------------
create table if not exists public.retailers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,          -- canonical display name, e.g. "REWE"
  aliases    text[] not null default '{}',  -- OCR variants, e.g. {RENE,RW,RE/WE}
  eligible   boolean not null default true, -- participates in the Gewinnspiel?
  notes      text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  canonical_name text not null,             -- e.g. "Overnight Oats Banana Split 400g"
  retailer_id    uuid references public.retailers(id) on delete set null, -- null = "Allgemein"
  variants       text[] not null default '{}', -- OCR strings that map to this product
  active         boolean not null default true,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Optional few-shot corrections captured from the "teach it" loop.
create table if not exists public.training_examples (
  id              uuid primary key default gen_random_uuid(),
  retailer_id     uuid references public.retailers(id) on delete set null,
  note            text,                     -- what the team wants the model to learn
  correct_retailer text,
  correct_products jsonb,                   -- [{name,price}]
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fact tables (replaces localStorage seen-cache + loose Excel)
-- ---------------------------------------------------------------------------
create table if not exists public.receipts (
  id             uuid primary key default gen_random_uuid(),
  source         text not null check (source in ('tally','email','excel')),
  submission_id  text,                      -- Tally submission id / stable key for dedup of re-runs
  submitted_at   timestamptz,
  vorname        text,
  nachname       text,
  email          text,
  retailer       text,
  receipt_date   text,                      -- as printed on the Bon (DD.MM.YYYY / "Unbekannt")
  total          text,
  fingerprint    text,                      -- retailer|date|total for duplicate detection
  verdict        text,                      -- Genehmigt (KI) / Genehmigt (Manuell) / Abgelehnt / Duplikat
  reason         text,
  raw_model_json jsonb,                     -- full model response for audit
  checked_by     uuid references auth.users(id),
  checked_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create index if not exists receipts_fingerprint_idx on public.receipts (fingerprint);
create index if not exists receipts_submission_idx  on public.receipts (submission_id);

create table if not exists public.receipt_products (
  id         uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  name       text,
  price      text
);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.app_users        enable row level security;
alter table public.retailers        enable row level security;
alter table public.products         enable row level security;
alter table public.training_examples enable row level security;
alter table public.receipts         enable row level security;
alter table public.receipt_products enable row level security;

-- app_users: a user can see their own row; admins see all; admins manage.
create policy app_users_self_read on public.app_users
  for select using (id = auth.uid() or public.is_admin());
create policy app_users_admin_write on public.app_users
  for all using (public.is_admin()) with check (public.is_admin());

-- Config: any authenticated user may READ (needed to build the prompt);
-- only admins may write.
create policy retailers_read on public.retailers
  for select using (auth.role() = 'authenticated');
create policy retailers_admin_write on public.retailers
  for all using (public.is_admin()) with check (public.is_admin());

create policy products_read on public.products
  for select using (auth.role() = 'authenticated');
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

create policy training_read on public.training_examples
  for select using (auth.role() = 'authenticated');
create policy training_write on public.training_examples
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Facts: any authenticated user may read + write (team shares one dataset).
create policy receipts_rw on public.receipts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy receipt_products_rw on public.receipt_products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Grants (auto-expose was disabled at project creation → grant explicitly)
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.app_users, public.retailers, public.products,
  public.training_examples, public.receipts, public.receipt_products
to authenticated;
