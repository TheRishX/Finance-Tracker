alter table public.profiles
  add column if not exists contact_email text,
  add column if not exists phone text,
  add column if not exists birth_date date;

alter table public.profiles drop constraint if exists profiles_contact_email_length;
alter table public.profiles add constraint profiles_contact_email_length check (contact_email is null or char_length(contact_email) <= 254);
alter table public.profiles drop constraint if exists profiles_phone_length;
alter table public.profiles add constraint profiles_phone_length check (phone is null or char_length(phone) <= 32);
