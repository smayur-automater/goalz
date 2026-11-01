-- Private storage for check-in photos and avatars.
-- Files live under "<profile_id>/...", and only that profile (or its guardian) can touch them.

-- Returns null instead of raising for anything that isn't a uuid, so a malformed
-- path is simply denied.
create function private.try_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;
revoke execute on function private.try_uuid(text) from public;
grant execute on function private.try_uuid(text) to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-media',
  'user-media',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "Owner reads own media" on storage.objects
  for select to authenticated using (
    bucket_id = 'user-media'
    and (select private.can_manage(private.try_uuid((storage.foldername(name))[1])))
  );

create policy "Owner uploads own media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'user-media'
    and (select private.can_manage(private.try_uuid((storage.foldername(name))[1])))
  );

create policy "Owner updates own media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'user-media'
    and (select private.can_manage(private.try_uuid((storage.foldername(name))[1])))
  )
  with check (
    bucket_id = 'user-media'
    and (select private.can_manage(private.try_uuid((storage.foldername(name))[1])))
  );

create policy "Owner deletes own media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'user-media'
    and (select private.can_manage(private.try_uuid((storage.foldername(name))[1])))
  );
