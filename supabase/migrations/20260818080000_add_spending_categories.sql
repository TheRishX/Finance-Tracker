alter table public.expenses alter column category type text using category::text;
drop type if exists public.expense_category;

create table if not exists public.spending_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  color text not null default '#c8cbc5' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table public.spending_categories enable row level security;
do $$ begin
  create policy "Own spending categories" on public.spending_categories for all to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $$;
grant select, insert, update, delete on public.spending_categories to authenticated;
revoke all on public.spending_categories from anon;
create index if not exists spending_categories_user_idx on public.spending_categories (user_id, created_at);
