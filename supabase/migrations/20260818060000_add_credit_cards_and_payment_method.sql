create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  last_four text check (last_four is null or last_four ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now()
);

alter table public.credit_cards enable row level security;
do $$ begin
  create policy "Own credit cards" on public.credit_cards for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;
grant select, insert, update, delete on public.credit_cards to authenticated;
revoke all on public.credit_cards from anon;
create index if not exists credit_cards_user_created_idx on public.credit_cards (user_id, created_at desc);

alter table public.expenses
  add column if not exists payment_method text not null default 'cash' check (payment_method in ('cash','credit_card')),
  add column if not exists credit_card_id uuid references public.credit_cards(id) on delete set null;

create index if not exists expenses_credit_card_idx on public.expenses (credit_card_id) where credit_card_id is not null;
