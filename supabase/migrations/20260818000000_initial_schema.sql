create type public.expense_category as enum ('Food','Transport','Study','Bills','Fun','Other');
create type public.wishlist_status as enum ('thinking','buy','save');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency text not null default 'NPR',
  cycle_start_day smallint not null default 20 check (cycle_start_day between 1 and 28),
  monthly_budget numeric(12,2) not null default 0 check (monthly_budget >= 0),
  emergency_reminders boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0), category public.expense_category not null,
  note text not null default '', spent_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.funds (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, kind text not null check (kind in ('savings','mutual_fund','emergency')),
  balance numeric(12,2) not null default 0 check (balance >= 0), hidden boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, price numeric(12,2) not null check (price >= 0), url text,
  reflection_answers jsonb not null default '[]'::jsonb, status public.wishlist_status not null default 'thinking',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.expenses enable row level security;
alter table public.funds enable row level security;
alter table public.wishlist_items enable row level security;

create policy "Own profile" on public.profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own expenses" on public.expenses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own funds" on public.funds for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own wishlist" on public.wishlist_items for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.profiles, public.expenses, public.funds, public.wishlist_items to authenticated;
revoke all on public.profiles, public.expenses, public.funds, public.wishlist_items from anon;
create index expenses_user_spent_idx on public.expenses (user_id, spent_at desc);
create index wishlist_user_created_idx on public.wishlist_items (user_id, created_at desc);
