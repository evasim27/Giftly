-- Apply once after 202610080001_initial.sql.
alter table public.events add column birthday_person_id uuid unique
  references public.people(id) on delete cascade;

create function public.next_birthday_date(p_birthday date) returns date
language plpgsql stable set search_path = '' as $$
declare year_number integer;
declare month_number integer;
declare day_number integer;
declare next_date date;
begin
  if p_birthday is null then return null; end if;
  year_number := extract(year from current_date)::integer;
  month_number := extract(month from p_birthday)::integer;
  day_number := extract(day from p_birthday)::integer;
  for attempt in 1..2 loop
    next_date := make_date(year_number, month_number,
      case when month_number = 2 and day_number = 29 and
        not (year_number % 4 = 0 and (year_number % 100 <> 0 or year_number % 400 = 0))
      then 28 else day_number end);
    if next_date >= current_date then return next_date; end if;
    year_number := year_number + 1;
  end loop;
  return next_date;
end $$;
revoke all on function public.next_birthday_date(date) from public;
grant execute on function public.next_birthday_date(date) to authenticated;

create function public.validate_birthday_event() returns trigger
language plpgsql set search_path = '' as $$
declare birthday_name text;
declare birthday_date date;
begin
  if tg_op = 'UPDATE' and old.birthday_person_id is distinct from new.birthday_person_id
  then raise exception 'Birthday event ownership cannot be changed'; end if;
  if new.birthday_person_id is not null then
    select p.name, p.birthday into birthday_name, birthday_date
    from public.people p where p.id = new.birthday_person_id and p.user_id = new.user_id;
    if birthday_date is null then raise exception 'A birthday event requires a matching person with a birthday'; end if;
    new.title := left(birthday_name || '''s birthday', 120);
    new.event_date := public.next_birthday_date(birthday_date);
  end if;
  return new;
end $$;
create trigger validate_birthday_event before insert or update on public.events
for each row execute function public.validate_birthday_event();

create function public.protect_birthday_event() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.birthday_person_id is not null and exists (
    select 1 from public.people p
    where p.id = old.birthday_person_id and p.user_id = old.user_id and p.birthday is not null
  ) then raise exception 'Remove the person birthday before deleting its event'; end if;
  return old;
end $$;
create trigger protect_birthday_event before delete on public.events
for each row execute function public.protect_birthday_event();

create function public.sync_person_birthday_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.birthday is null then
    delete from public.events where birthday_person_id = new.id and user_id = new.user_id;
  else
    insert into public.events(user_id, birthday_person_id, title, event_date)
    values (new.user_id, new.id, left(new.name || '''s birthday', 120), public.next_birthday_date(new.birthday))
    on conflict (birthday_person_id) do update
      set title = excluded.title, event_date = excluded.event_date;
  end if;
  return new;
end $$;
create trigger sync_person_birthday_event after insert or update of name, birthday on public.people
for each row execute function public.sync_person_birthday_event();

insert into public.events(user_id, birthday_person_id, title, event_date)
select p.user_id, p.id, left(p.name || '''s birthday', 120), public.next_birthday_date(p.birthday)
from public.people p where p.birthday is not null
on conflict (birthday_person_id) do nothing;

create view public.events_display with (security_invoker = true) as
select e.id, e.user_id, e.title,
  case when e.birthday_person_id is null then e.event_date
    else public.next_birthday_date(p.birthday) end as event_date,
  e.description, e.budget, e.created_at, e.birthday_person_id
from public.events e
left join public.people p on p.id = e.birthday_person_id and p.user_id = e.user_id;
grant select on public.events_display to authenticated;

alter table public.shared_lists add column person_id uuid references public.people(id) on delete cascade;
alter table public.shared_lists add constraint shared_lists_one_scope
  check (event_id is null or person_id is null);
create index shared_lists_person_idx on public.shared_lists(person_id);

create or replace function public.validate_share_ownership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.event_id is not null and not exists (
    select 1 from public.events where id = new.event_id and user_id = new.user_id
  ) then raise exception 'Shared event must belong to the link owner'; end if;
  if new.person_id is not null and not exists (
    select 1 from public.people where id = new.person_id and user_id = new.user_id
  ) then raise exception 'Shared person must belong to the link owner'; end if;
  return new;
end $$;

create or replace function public.get_shared_list(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then return null; end if;
  select jsonb_build_object(
    'title', case when s.event_id is not null then e.title
                  when s.person_id is not null then 'Person gift list'
                  else 'Shared gift list' end,
    'event_date', case when s.event_id is not null then
      case when e.birthday_person_id is null then e.event_date
           else public.next_birthday_date(bp.birthday) end
      else null end,
    'gifts', coalesce((select jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'description', g.description,
      'estimated_price', g.estimated_price, 'product_url', g.product_url,
      'status', g.status
    ) order by g.created_at desc) from public.gifts g
      where g.user_id = s.user_id and
        ((s.event_id is null and s.person_id is null)
          or (s.event_id is not null and g.event_id = s.event_id)
          or (s.person_id is not null and g.person_id = s.person_id))), '[]'::jsonb)
  ) into result
  from public.shared_lists s
  left join public.events e on e.id = s.event_id and e.user_id = s.user_id
  left join public.people bp on bp.id = e.birthday_person_id and bp.user_id = s.user_id
  where s.token_hash = p_token_hash and s.revoked_at is null;
  return result;
end $$;
revoke all on function public.get_shared_list(text) from public;
grant execute on function public.get_shared_list(text) to anon, authenticated;
