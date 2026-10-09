-- Run after the three migrations against the local stub database only.
begin;
insert into auth.users(id, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', '{"display_name":"Alice"}'),
  ('22222222-2222-4222-8222-222222222222', '{"display_name":"Bob"}');

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
insert into public.people(id, user_id, name, birthday) values
  ('33333333-3333-4333-8333-333333333333',
   '11111111-1111-4111-8111-111111111111', 'Alice Friend', '2000-02-29');
insert into public.gifts(user_id, person_id, name, status, estimated_price) values
  ('11111111-1111-4111-8111-111111111111',
   (select id from public.people where name = 'Alice Friend'), 'Idea', 'idea', 100),
  ('11111111-1111-4111-8111-111111111111',
   (select id from public.people where name = 'Alice Friend'), 'Plan', 'planned', 50),
  ('11111111-1111-4111-8111-111111111111',
   (select id from public.people where name = 'Alice Friend'), 'Bought', 'purchased', 80);
update public.gifts set actual_price = 60 where name = 'Bought';
update public.gifts set event_id =
  (select id from public.events where birthday_person_id = '33333333-3333-4333-8333-333333333333')
  where name = 'Bought';
insert into public.shared_lists(user_id, person_id, token_hash) values
  ('11111111-1111-4111-8111-111111111111',
   (select id from public.people where name = 'Alice Friend'), repeat('a', 64));
insert into public.shared_lists(user_id, event_id, token_hash) values
  ('11111111-1111-4111-8111-111111111111',
   (select id from public.events where birthday_person_id = '33333333-3333-4333-8333-333333333333'),
   repeat('c', 64));
insert into public.shared_lists(user_id, token_hash) values
  ('11111111-1111-4111-8111-111111111111', repeat('d', 64));
insert into storage.objects(bucket_id, name, owner_id) values
  ('gift-images',
   '11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444.jpg',
   '11111111-1111-4111-8111-111111111111');

do $$
declare totals jsonb; linked_count integer; list jsonb;
begin
  totals := public.get_my_gift_totals();
  if (totals ->> 'spent')::numeric <> 60 or (totals ->> 'committed')::numeric <> 110
  then raise exception 'Gift totals are incorrect: %', totals; end if;
  select count(*) into linked_count from public.events
    where birthday_person_id = (select id from public.people where name = 'Alice Friend');
  if linked_count <> 1 then raise exception 'Birthday event was not created'; end if;
  list := public.get_shared_list(repeat('a', 64));
  if jsonb_array_length(list -> 'gifts') <> 3 or list ? 'user_id'
  then raise exception 'Person share scope or public fields are incorrect: %', list; end if;
  if jsonb_array_length(public.get_shared_list(repeat('c', 64)) -> 'gifts') <> 1 or
     jsonb_array_length(public.get_shared_list(repeat('d', 64)) -> 'gifts') <> 3
  then raise exception 'Event or all-gifts share scope is incorrect'; end if;
end $$;

set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$
begin
  if (select count(*) from public.people) <> 0 or
     (select count(*) from public.events_display) <> 0 or
     (select count(*) from public.gifts) <> 0 or
     (select count(*) from public.shared_lists) <> 0 or
     (select count(*) from storage.objects) <> 0
  then raise exception 'RLS exposed Alice data to Bob'; end if;
  if (public.get_my_gift_totals() ->> 'spent')::numeric <> 0
  then raise exception 'Budget RPC exposed Alice totals'; end if;
end $$;

-- Bob cannot use Alice's person in a gift or share, even when supplying his own user ID.
do $$
begin
  begin
    insert into public.gifts(user_id, person_id, name)
    values ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'Invalid');
    raise exception 'Cross-owner gift assignment was accepted';
  exception when others then
    if sqlerrm = 'Cross-owner gift assignment was accepted' then raise; end if;
  end;
  begin
    insert into public.shared_lists(user_id, person_id, token_hash)
    values ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', repeat('b', 64));
    raise exception 'Cross-owner share was accepted';
  exception when others then
    if sqlerrm = 'Cross-owner share was accepted' then raise; end if;
  end;
  begin
    insert into storage.objects(bucket_id, name, owner_id) values
      ('gift-images',
       '11111111-1111-4111-8111-111111111111/55555555-5555-4555-8555-555555555555.jpg',
       '22222222-2222-4222-8222-222222222222');
    raise exception 'Cross-owner storage insert was accepted';
  exception when others then
    if sqlerrm = 'Cross-owner storage insert was accepted' then raise; end if;
  end;
end $$;

reset role;
set role anon;
do $$
declare list jsonb;
begin
  list := public.get_shared_list(repeat('a', 64));
  if jsonb_array_length(list -> 'gifts') <> 3 then raise exception 'Public share failed'; end if;
  if list::text like '%actual_price%' or list::text like '%user_id%' or list::text like '%image_path%'
  then raise exception 'Public share exposed private fields'; end if;
end $$;
reset role;
update public.shared_lists set revoked_at = now() where token_hash = repeat('a', 64);
set role anon;
do $$ begin
  if public.get_shared_list(repeat('a', 64)) is not null
  then raise exception 'Revoked share remains accessible'; end if;
end $$;
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
update public.people set birthday = null where name = 'Alice Friend';
do $$ begin
  if (select count(*) from public.events where birthday_person_id =
    '33333333-3333-4333-8333-333333333333') <> 0
  then raise exception 'Clearing a birthday did not remove its event'; end if;
end $$;
reset role;
rollback;
