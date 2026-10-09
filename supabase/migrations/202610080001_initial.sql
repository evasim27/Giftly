-- Apply once to a new Supabase project, before the later numbered migrations.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  relationship text not null default '' check (char_length(relationship) <= 80),
  birthday date,
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  event_date date not null,
  description text not null default '' check (char_length(description) <= 2000),
  budget numeric(12,2) check (budget >= 0),
  created_at timestamptz not null default now()
);

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 3000),
  estimated_price numeric(12,2) check (estimated_price >= 0),
  actual_price numeric(12,2) check (actual_price >= 0),
  product_url text check (product_url is null or (char_length(product_url) <= 2048 and product_url ~* '^https?://')),
  status text not null default 'idea' check (status in ('idea', 'planned', 'purchased', 'gifted')),
  created_at timestamptz not null default now()
);

create table public.person_budgets (
  person_id uuid primary key references public.people(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0)
);

create table public.shared_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index people_user_name_idx on public.people(user_id, name);
create index events_user_date_idx on public.events(user_id, event_date);
create index gifts_user_created_idx on public.gifts(user_id, created_at desc);
create index gifts_user_status_idx on public.gifts(user_id, status);
create index gifts_person_idx on public.gifts(person_id);
create index gifts_event_idx on public.gifts(event_id);
create index shared_lists_user_created_idx on public.shared_lists(user_id, created_at desc);

create function public.validate_gift_ownership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.person_id is not null and not exists (
    select 1 from public.people where id = new.person_id and user_id = new.user_id
  ) then raise exception 'Gift person must belong to the gift owner'; end if;
  if new.event_id is not null and not exists (
    select 1 from public.events where id = new.event_id and user_id = new.user_id
  ) then raise exception 'Gift event must belong to the gift owner'; end if;
  return new;
end $$;
create trigger validate_gift_ownership before insert or update on public.gifts
for each row execute function public.validate_gift_ownership();

create function public.validate_person_budget_ownership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.people where id = new.person_id and user_id = new.user_id)
  then raise exception 'Budget person must belong to the budget owner'; end if;
  return new;
end $$;
create trigger validate_person_budget_ownership before insert or update on public.person_budgets
for each row execute function public.validate_person_budget_ownership();

create function public.validate_share_ownership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.event_id is not null and not exists (
    select 1 from public.events where id = new.event_id and user_id = new.user_id
  ) then raise exception 'Shared event must belong to the link owner'; end if;
  return new;
end $$;
create trigger validate_share_ownership before insert or update on public.shared_lists
for each row execute function public.validate_share_ownership();

alter table public.profiles enable row level security;
alter table public.people enable row level security;
alter table public.events enable row level security;
alter table public.gifts enable row level security;
alter table public.person_budgets enable row level security;
alter table public.shared_lists enable row level security;

create policy profiles_owner on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy people_owner on public.people for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy events_owner on public.events for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy gifts_owner on public.gifts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy person_budgets_owner on public.person_budgets for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy shared_lists_owner on public.shared_lists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
insert into public.profiles(id, display_name)
select id, left(coalesce(raw_user_meta_data ->> 'display_name', ''), 80)
from auth.users on conflict (id) do nothing;

create function public.get_my_gift_totals(p_person_id uuid default null, p_event_id uuid default null)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'spent', coalesce(sum(coalesce(g.actual_price, g.estimated_price, 0))
      filter (where g.status in ('purchased', 'gifted')), 0),
    'committed', coalesce(sum(coalesce(g.actual_price, g.estimated_price, 0))
      filter (where g.status <> 'idea'), 0)
  )
  from public.gifts g
  where g.user_id = (select auth.uid())
    and (p_person_id is null or g.person_id = p_person_id)
    and (p_event_id is null or g.event_id = p_event_id);
$$;
revoke all on function public.get_my_gift_totals(uuid, uuid) from public;
grant execute on function public.get_my_gift_totals(uuid, uuid) to authenticated;

create function public.get_shared_list(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then return null; end if;
  select jsonb_build_object(
    'title', case when s.event_id is null then 'Shared gift list' else e.title end,
    'event_date', e.event_date,
    'gifts', coalesce((select jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'description', g.description,
      'estimated_price', g.estimated_price, 'product_url', g.product_url,
      'status', g.status
    ) order by g.created_at desc)
      from public.gifts g where g.user_id = s.user_id
      and (s.event_id is null or g.event_id = s.event_id)), '[]'::jsonb)
  ) into result
  from public.shared_lists s
  left join public.events e on e.id = s.event_id and e.user_id = s.user_id
  where s.token_hash = p_token_hash and s.revoked_at is null;
  return result;
end $$;
revoke all on function public.get_shared_list(text) from public;
grant execute on function public.get_shared_list(text) to anon, authenticated;
