-- Internal trigger functions do not need to be executable through PostgREST.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.normalize_chat_message() from public, anon, authenticated;
revoke all on function public.notify_chat_message() from public, anon, authenticated;
revoke all on function public.notify_mission_application() from public, anon, authenticated;
revoke all on function public.notify_mission_assignment() from public, anon, authenticated;

-- The avatars bucket remains public for direct object URLs, but clients no
-- longer need a broad SELECT policy that permits listing every stored object.
drop policy if exists avatars_public_read on storage.objects;
