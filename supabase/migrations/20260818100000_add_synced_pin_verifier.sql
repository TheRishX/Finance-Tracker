alter table public.profiles
  add column if not exists pin_salt text,
  add column if not exists pin_hash text;

alter table public.profiles drop constraint if exists profiles_pin_pair;
alter table public.profiles add constraint profiles_pin_pair check (
  (pin_salt is null and pin_hash is null) or
  (pin_salt is not null and pin_hash is not null)
);
