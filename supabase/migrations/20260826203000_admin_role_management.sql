-- Allow an existing administrator to promote an active account to administrator.
-- The operation is server-controlled and recorded for accountability.

create table if not exists public.admin_role_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  target_id uuid not null references public.profiles(id) on delete restrict,
  previous_role text not null
    check (previous_role in ('patient', 'professional', 'establishment')),
  action text not null default 'promoted_to_admin'
    check (action = 'promoted_to_admin'),
  created_at timestamptz not null default now()
);

alter table public.admin_role_audit enable row level security;

revoke all on table public.admin_role_audit from anon, authenticated;
grant select on table public.admin_role_audit to authenticated;

drop policy if exists admin_role_audit_select_admin on public.admin_role_audit;
create policy admin_role_audit_select_admin on public.admin_role_audit
for select to authenticated
using (public.is_admin());

create or replace function public.promote_user_to_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
  target_disabled boolean;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;

  select p.role, p.disabled
    into target_role, target_disabled
  from public.profiles p
  where p.id = p_user_id
  for update;

  if not found then
    raise exception 'Profil introuvable.' using errcode = 'P0002';
  end if;

  if target_disabled then
    raise exception 'Un compte désactivé ne peut pas devenir administrateur.'
      using errcode = '22023';
  end if;

  if target_role = 'admin' then
    return;
  end if;

  if target_role not in ('patient', 'professional', 'establishment') then
    raise exception 'Rôle source invalide.' using errcode = '22023';
  end if;

  update public.profiles
  set role = 'admin', updated_at = now()
  where id = p_user_id;

  insert into public.admin_role_audit (actor_id, target_id, previous_role)
  values (auth.uid(), p_user_id, target_role);
end;
$$;

revoke all on function public.promote_user_to_admin(uuid) from public, anon;
grant execute on function public.promote_user_to_admin(uuid) to authenticated;
