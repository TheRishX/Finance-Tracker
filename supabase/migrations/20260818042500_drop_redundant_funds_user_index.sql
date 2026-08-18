-- The unique (user_id, kind) index already covers lookups and the foreign key.
drop index if exists public.funds_user_id_idx;
