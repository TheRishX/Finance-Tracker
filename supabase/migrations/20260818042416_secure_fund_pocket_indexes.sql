create index if not exists funds_user_id_idx on public.funds (user_id);
create unique index if not exists funds_user_kind_unique_idx on public.funds (user_id, kind);
