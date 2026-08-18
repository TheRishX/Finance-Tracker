alter table public.spending_categories
  add column if not exists icon_key text not null default 'other';

update public.spending_categories set icon_key = case lower(name)
  when 'food' then 'food' when 'transport' then 'transport'
  when 'study' then 'study' when 'bills' then 'bills'
  when 'fun' then 'fun' when 'shopping' then 'shopping'
  when 'health' then 'health' when 'home' then 'home'
  else icon_key end;
