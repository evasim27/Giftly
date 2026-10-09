-- Run this incremental migration once in the Supabase SQL Editor.
-- It preserves existing gifts and keeps the Storage bucket private.
alter table public.gifts
  add column if not exists image_url text,
  add column if not exists image_path text;

alter table public.gifts
  add constraint gifts_image_url_https check (
    image_url is null or (char_length(image_url) <= 2048 and image_url ~* '^https://')
  ),
  add constraint gifts_image_source check (image_url is null or image_path is null),
  add constraint gifts_image_path_owner check (
    image_path is null or image_path ~ (
      '^' || user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$'
    )
  );

create unique index gifts_image_path_unique on public.gifts (image_path) where image_path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gift-images', 'gift-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy gift_images_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'gift-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy gift_images_select on storage.objects
  for select to authenticated using (
    bucket_id = 'gift-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
  );
create policy gift_images_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'gift-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
  );

-- Keep public lists scoped to the existing share token. The object path stays private;
-- the server looks it up only after this function validates the token.
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
      'id', g.id,
      'name', g.name,
      'description', g.description,
      'estimated_price', g.estimated_price,
      'product_url', g.product_url,
      'status', g.status,
      'image_url', g.image_url
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
