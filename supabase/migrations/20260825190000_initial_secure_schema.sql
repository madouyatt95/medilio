-- Medilio — secure production schema
-- Target: a fresh Supabase project. The migration is intentionally rerunnable.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  role text not null default 'patient'
    check (role in ('patient', 'professional', 'establishment', 'admin')),
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  street text not null default '',
  city text not null default '',
  postal_code text not null default '',
  avatar_url text,
  specialties text[] not null default '{}',
  bio text not null default '',
  radius integer not null default 20 check (radius between 1 and 200),
  availability jsonb not null default '{"days":[],"hours":{"start":"08:00","end":"18:00"}}'::jsonb,
  establishment_name text not null default '',
  establishment_type text not null default '',
  finess_number text not null default '',
  service text not null default '',
  verified boolean not null default false,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.managed_patients (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.profiles(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  age smallint check (age between 0 and 125),
  phone text not null default '',
  conditions text not null default '',
  street text not null default '',
  city text not null default '',
  postal_code text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  managed_patient_id uuid references public.managed_patients(id) on delete set null,
  created_by_establishment_id uuid references public.profiles(id) on delete set null,
  assigned_pro_id uuid references public.profiles(id) on delete set null,
  care_type text not null,
  description text not null default '',
  street text not null default '',
  city text not null,
  postal_code text not null default '',
  lat double precision,
  lng double precision,
  scheduled_date date not null,
  scheduled_time time not null,
  patient_name text not null,
  patient_age smallint check (patient_age between 0 and 125),
  patient_conditions text not null default '',
  estimated_duration integer not null default 30 check (estimated_duration between 5 and 1440),
  estimated_cost numeric(10,2) check (estimated_cost is null or estimated_cost >= 0),
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'biweekly', 'monthly')),
  recurrence_end_date date,
  parent_mission_id uuid references public.missions(id) on delete set null,
  documents jsonb not null default '[]'::jsonb check (jsonb_typeof(documents) = 'array'),
  discharge_mode boolean not null default false,
  discharge_date date,
  medical_notes text not null default '',
  status text not null default 'open'
    check (status in ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mission_applicants (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  pro_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  applied_at timestamptz not null default now(),
  unique (mission_id, pro_id)
);

create table if not exists public.mission_care_notes (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  pro_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  pro_id uuid not null references public.profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (mission_id, patient_id)
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null unique references public.missions(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null default '',
  content text not null check (char_length(content) between 1 and 5000),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  patient_id uuid not null references public.profiles(id) on delete cascade,
  pro_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (patient_id, pro_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  link text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.email_dispatches (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  mission_id uuid not null references public.missions(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  created_at timestamptz not null default now()
);

alter table public.email_dispatches
  drop constraint if exists email_dispatches_event_mission_id_recipient_id_key;
create unique index if not exists email_dispatches_idempotency_idx
  on public.email_dispatches (event, mission_id, recipient_id, requested_by);

create index if not exists missions_patient_idx on public.missions (patient_id, created_at desc);
create index if not exists missions_establishment_idx on public.missions (created_by_establishment_id, created_at desc);
create index if not exists missions_pro_idx on public.missions (assigned_pro_id, created_at desc);
create index if not exists missions_open_idx on public.missions (status, scheduled_date, city);
create index if not exists managed_patients_establishment_idx on public.managed_patients (establishment_id, created_at desc);
create index if not exists applicants_mission_idx on public.mission_applicants (mission_id, applied_at desc);
create index if not exists care_notes_mission_idx on public.mission_care_notes (mission_id, created_at);
create index if not exists messages_chat_idx on public.chat_messages (chat_id, created_at);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists managed_patients_set_updated_at on public.managed_patients;
create trigger managed_patients_set_updated_at
before update on public.managed_patients
for each row execute function public.set_updated_at();

drop trigger if exists missions_set_updated_at on public.missions;
create trigger missions_set_updated_at
before update on public.missions
for each row execute function public.set_updated_at();

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and not p.disabled;
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and not p.disabled
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and not p.disabled
  );
$$;

create or replace function public.is_verified_professional()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'professional'
      and p.verified
      and not p.disabled
  );
$$;

create or replace function public.is_mission_owner(p_mission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.missions m
    where m.id = p_mission_id
      and (m.patient_id = auth.uid() or m.created_by_establishment_id = auth.uid())
  );
$$;

create or replace function public.is_mission_participant(p_mission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.missions m
    where m.id = p_mission_id
      and (
        m.patient_id = auth.uid()
        or m.created_by_establishment_id = auth.uid()
        or m.assigned_pro_id = auth.uid()
      )
  );
$$;

create or replace function public.can_access_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.missions m
      where (
        m.patient_id = auth.uid()
        or m.created_by_establishment_id = auth.uid()
        or m.assigned_pro_id = auth.uid()
      )
      and p_profile_id in (m.patient_id, m.created_by_establishment_id, m.assigned_pro_id)
    );
$$;

create or replace function public.can_access_mission_document(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select split_part(p_path, '/', 1) = auth.uid()::text
    or public.is_admin()
    or exists (
      select 1
      from public.missions m
      cross join lateral jsonb_array_elements(m.documents) d
      where d ->> 'path' = p_path
        and (
          m.patient_id = auth.uid()
          or m.created_by_establishment_id = auth.uid()
          or m.assigned_pro_id = auth.uid()
        )
    );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'patient');
  if requested_role not in ('patient', 'professional', 'establishment') then
    requested_role := 'patient';
  end if;

  insert into public.profiles (
    id, email, role, first_name, last_name, phone, street, city, postal_code,
    establishment_name, establishment_type, finess_number, service
  ) values (
    new.id,
    coalesce(new.email, ''),
    requested_role,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'street', ''),
    coalesce(new.raw_user_meta_data ->> 'city', ''),
    coalesce(new.raw_user_meta_data ->> 'postal_code', ''),
    case when requested_role = 'establishment' then coalesce(new.raw_user_meta_data ->> 'establishment_name', '') else '' end,
    case when requested_role = 'establishment' then coalesce(new.raw_user_meta_data ->> 'establishment_type', '') else '' end,
    case when requested_role = 'establishment' then coalesce(new.raw_user_meta_data ->> 'finess_number', '') else '' end,
    case when requested_role = 'establishment' then coalesce(new.raw_user_meta_data ->> 'service', '') else '' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
     and not public.is_admin()
     and (
       new.role is distinct from old.role
       or new.verified is distinct from old.verified
       or new.disabled is distinct from old.disabled
       or new.email is distinct from old.email
     ) then
    raise exception 'Les champs de sécurité du profil ne peuvent être modifiés que par un administrateur.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_fields on public.profiles;
create trigger profiles_protect_privileged_fields
before update on public.profiles
for each row execute function public.protect_profile_privileged_fields();

create or replace function public.protect_mission_controlled_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
     and not public.is_admin()
     and (
       new.patient_id is distinct from old.patient_id
       or new.managed_patient_id is distinct from old.managed_patient_id
       or new.created_by_establishment_id is distinct from old.created_by_establishment_id
       or new.assigned_pro_id is distinct from old.assigned_pro_id
       or new.status is distinct from old.status
     ) then
    raise exception 'Utilisez les actions sécurisées pour modifier le statut ou l''affectation.';
  end if;
  return new;
end;
$$;

drop trigger if exists missions_protect_controlled_fields on public.missions;
create trigger missions_protect_controlled_fields
before update on public.missions
for each row execute function public.protect_mission_controlled_fields();

create or replace function public.validate_mission_patient()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by_establishment_id is not null then
    if new.patient_id <> new.created_by_establishment_id then
      raise exception 'Le compte porteur doit être l''établissement créateur.';
    end if;
    if new.managed_patient_id is not null and not exists (
      select 1 from public.managed_patients mp
      where mp.id = new.managed_patient_id
        and mp.establishment_id = new.created_by_establishment_id
    ) then
      raise exception 'Le patient géré ne dépend pas de cet établissement.';
    end if;
  elsif new.managed_patient_id is not null then
    raise exception 'Un patient géré exige un établissement créateur.';
  end if;
  return new;
end;
$$;

drop trigger if exists missions_validate_patient on public.missions;
create trigger missions_validate_patient
before insert or update on public.missions
for each row execute function public.validate_mission_patient();

create or replace function public.normalize_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.sender_id := auth.uid();
  select trim(concat_ws(' ', p.first_name, p.last_name))
    into new.sender_name
  from public.profiles p
  where p.id = auth.uid();
  return new;
end;
$$;

drop trigger if exists chat_messages_normalize_sender on public.chat_messages;
create trigger chat_messages_normalize_sender
before insert on public.chat_messages
for each row execute function public.normalize_chat_message();

create or replace function public.protect_chat_message_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
     and (
       new.chat_id is distinct from old.chat_id
       or new.sender_id is distinct from old.sender_id
       or new.sender_name is distinct from old.sender_name
       or new.content is distinct from old.content
       or new.created_at is distinct from old.created_at
     ) then
    raise exception 'Seul l''état de lecture peut être modifié.';
  end if;
  return new;
end;
$$;

drop trigger if exists chat_messages_protect_update on public.chat_messages;
create trigger chat_messages_protect_update
before update on public.chat_messages
for each row execute function public.protect_chat_message_update();

create or replace function public.list_available_missions()
returns table (
  id uuid,
  patient_id uuid,
  status text,
  care_type text,
  description text,
  street text,
  city text,
  postal_code text,
  lat double precision,
  lng double precision,
  scheduled_date date,
  scheduled_time time,
  patient_name text,
  patient_age smallint,
  patient_conditions text,
  documents jsonb,
  assigned_pro_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  estimated_duration integer,
  estimated_cost numeric,
  recurrence text,
  created_by_establishment_id uuid,
  discharge_mode boolean,
  discharge_date date,
  medical_notes text,
  has_applied boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    null::uuid,
    m.status,
    m.care_type,
    ''::text,
    ''::text,
    m.city,
    left(m.postal_code, 2) || '***',
    round(m.lat::numeric, 2)::double precision,
    round(m.lng::numeric, 2)::double precision,
    m.scheduled_date,
    m.scheduled_time,
    ''::text,
    null::smallint,
    ''::text,
    '[]'::jsonb,
    null::uuid,
    m.created_at,
    m.updated_at,
    m.estimated_duration,
    m.estimated_cost,
    m.recurrence,
    null::uuid,
    m.discharge_mode,
    m.discharge_date,
    ''::text,
    exists (
      select 1 from public.mission_applicants ma
      where ma.mission_id = m.id and ma.pro_id = auth.uid()
    )
  from public.missions m
  where m.status = 'open'
    and public.is_verified_professional()
  order by m.created_at desc;
$$;

create or replace function public.get_public_professionals(p_profile_id uuid default null)
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  specialties text[],
  bio text,
  city text,
  radius integer,
  verified boolean,
  rating_average numeric,
  rating_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.specialties,
    p.bio,
    p.city,
    p.radius,
    p.verified,
    coalesce(round(avg(r.score)::numeric, 1), 0),
    count(r.id)
  from public.profiles p
  left join public.ratings r on r.pro_id = p.id
  where public.is_active_user()
    and p.role = 'professional'
    and p.verified
    and not p.disabled
    and (p_profile_id is null or p.id = p_profile_id)
  group by p.id;
$$;

create or replace function public.accept_mission_applicant(p_mission_id uuid, p_pro_id uuid)
returns public.missions
language plpgsql
security definer
set search_path = ''
as $$
declare
  mission_row public.missions;
begin
  select * into mission_row from public.missions where id = p_mission_id for update;
  if mission_row.id is null then raise exception 'Mission introuvable.'; end if;
  if not (public.is_admin() or mission_row.patient_id = auth.uid() or mission_row.created_by_establishment_id = auth.uid()) then
    raise exception 'Action non autorisée.';
  end if;
  if mission_row.status <> 'open' then raise exception 'Cette mission n''est plus ouverte.'; end if;
  if not exists (
    select 1
    from public.mission_applicants ma
    join public.profiles p on p.id = ma.pro_id
    where ma.mission_id = p_mission_id
      and ma.pro_id = p_pro_id
      and p.role = 'professional'
      and p.verified
      and not p.disabled
  ) then
    raise exception 'Candidature professionnelle invalide.';
  end if;

  update public.missions
  set assigned_pro_id = p_pro_id, status = 'assigned'
  where id = p_mission_id
  returning * into mission_row;

  insert into public.chats (mission_id) values (p_mission_id)
  on conflict (mission_id) do nothing;
  return mission_row;
end;
$$;

create or replace function public.reject_mission_applicant(p_mission_id uuid, p_pro_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mission_row public.missions;
begin
  select * into mission_row from public.missions where id = p_mission_id;
  if mission_row.id is null then raise exception 'Mission introuvable.'; end if;
  if not (public.is_admin() or mission_row.patient_id = auth.uid() or mission_row.created_by_establishment_id = auth.uid()) then
    raise exception 'Action non autorisée.';
  end if;
  delete from public.mission_applicants
  where mission_id = p_mission_id and pro_id = p_pro_id;
end;
$$;

create or replace function public.update_mission_status(p_mission_id uuid, p_status text)
returns public.missions
language plpgsql
security definer
set search_path = ''
as $$
declare
  mission_row public.missions;
  caller_role text;
begin
  if p_status not in ('open', 'assigned', 'in_progress', 'completed', 'cancelled') then
    raise exception 'Statut invalide.';
  end if;

  select * into mission_row from public.missions where id = p_mission_id for update;
  if mission_row.id is null then raise exception 'Mission introuvable.'; end if;
  caller_role := public.current_profile_role();

  if public.is_admin() then
    null;
  elsif mission_row.assigned_pro_id = auth.uid() then
    if not (
      (mission_row.status = 'assigned' and p_status in ('in_progress', 'completed'))
      or (mission_row.status = 'in_progress' and p_status = 'completed')
    ) then
      raise exception 'Transition de statut non autorisée.';
    end if;
  elsif mission_row.patient_id = auth.uid() or mission_row.created_by_establishment_id = auth.uid() then
    if not (
      (mission_row.status in ('open', 'assigned') and p_status = 'cancelled')
      or (mission_row.status in ('assigned', 'in_progress') and p_status = 'completed')
    ) then
      raise exception 'Transition de statut non autorisée.';
    end if;
  else
    raise exception 'Action non autorisée.';
  end if;

  update public.missions set status = p_status where id = p_mission_id
  returning * into mission_row;
  return mission_row;
end;
$$;

create or replace function public.notify_mission_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mission_row public.missions;
  professional_name text;
begin
  select * into mission_row from public.missions where id = new.mission_id;
  select trim(concat_ws(' ', first_name, last_name)) into professional_name
    from public.profiles where id = new.pro_id;
  insert into public.notifications (user_id, type, title, message, link)
  values (
    coalesce(mission_row.created_by_establishment_id, mission_row.patient_id),
    'application',
    'Nouvelle candidature',
    coalesce(professional_name, 'Un professionnel') || ' a postulé à votre mission.',
    case when mission_row.created_by_establishment_id is null
      then '/patient/mission/' || mission_row.id::text
      else '/etab/mission/' || mission_row.id::text end
  );
  return new;
end;
$$;

drop trigger if exists applicant_create_notification on public.mission_applicants;
create trigger applicant_create_notification
after insert on public.mission_applicants
for each row execute function public.notify_mission_application();

create or replace function public.notify_mission_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_pro_id is distinct from old.assigned_pro_id and new.assigned_pro_id is not null then
    insert into public.notifications (user_id, type, title, message, link)
    values (
      new.assigned_pro_id,
      'mission_accepted',
      'Candidature acceptée',
      'Votre candidature a été acceptée.',
      '/pro/mission/' || new.id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists mission_assignment_notification on public.missions;
create trigger mission_assignment_notification
after update on public.missions
for each row execute function public.notify_mission_assignment();

create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mission_row public.missions;
  mission_id_value uuid;
  recipient_id uuid;
begin
  select c.mission_id into mission_id_value from public.chats c where c.id = new.chat_id;
  select * into mission_row from public.missions where id = mission_id_value;
  if new.sender_id = mission_row.assigned_pro_id then
    recipient_id := coalesce(mission_row.created_by_establishment_id, mission_row.patient_id);
  else
    recipient_id := mission_row.assigned_pro_id;
  end if;
  if recipient_id is not null then
    insert into public.notifications (user_id, type, title, message, link)
    values (
      recipient_id,
      'message',
      'Nouveau message',
      left(new.content, 120),
      '/chat/' || mission_id_value::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists chat_message_create_notification on public.chat_messages;
create trigger chat_message_create_notification
after insert on public.chat_messages
for each row execute function public.notify_chat_message();

alter table public.profiles enable row level security;
alter table public.managed_patients enable row level security;
alter table public.missions enable row level security;
alter table public.mission_applicants enable row level security;
alter table public.mission_care_notes enable row level security;
alter table public.ratings enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.email_dispatches enable row level security;

revoke all on table public.email_dispatches from anon, authenticated;

drop policy if exists profiles_select_authorized on public.profiles;
create policy profiles_select_authorized on public.profiles
for select to authenticated
using (public.can_access_profile(id));

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using ((id = auth.uid() and public.is_active_user()) or public.is_admin())
with check ((id = auth.uid() and public.is_active_user()) or public.is_admin());

drop policy if exists managed_patients_select_authorized on public.managed_patients;
create policy managed_patients_select_authorized on public.managed_patients
for select to authenticated
using (
  establishment_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.missions m
    where m.managed_patient_id = managed_patients.id and m.assigned_pro_id = auth.uid()
  )
);

drop policy if exists managed_patients_insert_establishment on public.managed_patients;
create policy managed_patients_insert_establishment on public.managed_patients
for insert to authenticated
with check (establishment_id = auth.uid() and public.current_profile_role() = 'establishment');

drop policy if exists managed_patients_update_establishment on public.managed_patients;
create policy managed_patients_update_establishment on public.managed_patients
for update to authenticated
using (establishment_id = auth.uid() or public.is_admin())
with check (establishment_id = auth.uid() or public.is_admin());

drop policy if exists managed_patients_delete_establishment on public.managed_patients;
create policy managed_patients_delete_establishment on public.managed_patients
for delete to authenticated
using (establishment_id = auth.uid() or public.is_admin());

drop policy if exists missions_select_participants on public.missions;
create policy missions_select_participants on public.missions
for select to authenticated
using (public.is_active_user() and public.is_mission_participant(id));

drop policy if exists missions_insert_owner on public.missions;
create policy missions_insert_owner on public.missions
for insert to authenticated
with check (
  public.is_active_user()
  and (
    (
      public.current_profile_role() = 'patient'
      and patient_id = auth.uid()
      and created_by_establishment_id is null
      and managed_patient_id is null
    )
    or (
      public.current_profile_role() = 'establishment'
      and patient_id = auth.uid()
      and created_by_establishment_id = auth.uid()
    )
    or public.is_admin()
  )
);

drop policy if exists missions_update_owner on public.missions;
create policy missions_update_owner on public.missions
for update to authenticated
using (public.is_mission_owner(id) or public.is_admin())
with check (public.is_mission_owner(id) or public.is_admin());

drop policy if exists missions_delete_owner on public.missions;
create policy missions_delete_owner on public.missions
for delete to authenticated
using (public.is_mission_owner(id) or public.is_admin());

drop policy if exists applicants_select_authorized on public.mission_applicants;
create policy applicants_select_authorized on public.mission_applicants
for select to authenticated
using (pro_id = auth.uid() or public.is_mission_owner(mission_id) or public.is_admin());

drop policy if exists applicants_insert_professional on public.mission_applicants;
create policy applicants_insert_professional on public.mission_applicants
for insert to authenticated
with check (
  pro_id = auth.uid()
  and public.is_verified_professional()
  and exists (select 1 from public.missions m where m.id = mission_id and m.status = 'open')
);

drop policy if exists applicants_delete_authorized on public.mission_applicants;
create policy applicants_delete_authorized on public.mission_applicants
for delete to authenticated
using (pro_id = auth.uid() or public.is_mission_owner(mission_id) or public.is_admin());

drop policy if exists care_notes_select_participants on public.mission_care_notes;
create policy care_notes_select_participants on public.mission_care_notes
for select to authenticated
using (public.is_mission_participant(mission_id));

drop policy if exists care_notes_insert_assigned_pro on public.mission_care_notes;
create policy care_notes_insert_assigned_pro on public.mission_care_notes
for insert to authenticated
with check (
  pro_id = auth.uid()
  and exists (
    select 1 from public.missions m
    where m.id = mission_id and m.assigned_pro_id = auth.uid() and m.status in ('assigned', 'in_progress')
  )
);

drop policy if exists ratings_select_authorized on public.ratings;
create policy ratings_select_authorized on public.ratings
for select to authenticated
using (patient_id = auth.uid() or pro_id = auth.uid() or public.is_admin());

drop policy if exists ratings_insert_owner on public.ratings;
create policy ratings_insert_owner on public.ratings
for insert to authenticated
with check (
  patient_id = auth.uid()
  and exists (
    select 1 from public.missions m
    where m.id = mission_id
      and m.patient_id = auth.uid()
      and m.assigned_pro_id = pro_id
      and m.status = 'completed'
  )
);

drop policy if exists chats_select_participants on public.chats;
create policy chats_select_participants on public.chats
for select to authenticated
using (public.is_mission_participant(mission_id));

drop policy if exists chats_insert_participants on public.chats;
create policy chats_insert_participants on public.chats
for insert to authenticated
with check (public.is_mission_participant(mission_id));

drop policy if exists messages_select_participants on public.chat_messages;
create policy messages_select_participants on public.chat_messages
for select to authenticated
using (
  exists (
    select 1 from public.chats c
    where c.id = chat_id and public.is_mission_participant(c.mission_id)
  )
);

drop policy if exists messages_insert_participants on public.chat_messages;
create policy messages_insert_participants on public.chat_messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_active_user()
  and exists (
    select 1 from public.chats c
    where c.id = chat_id and public.is_mission_participant(c.mission_id)
  )
);

drop policy if exists messages_update_participants on public.chat_messages;
create policy messages_update_participants on public.chat_messages
for update to authenticated
using (
  exists (
    select 1 from public.chats c
    where c.id = chat_id and public.is_mission_participant(c.mission_id)
  )
)
with check (
  exists (
    select 1 from public.chats c
    where c.id = chat_id and public.is_mission_participant(c.mission_id)
  )
);

drop policy if exists favorites_select_owner on public.favorites;
create policy favorites_select_owner on public.favorites
for select to authenticated
using (patient_id = auth.uid() or public.is_admin());

drop policy if exists favorites_insert_owner on public.favorites;
create policy favorites_insert_owner on public.favorites
for insert to authenticated
with check (patient_id = auth.uid() and public.current_profile_role() = 'patient');

drop policy if exists favorites_delete_owner on public.favorites;
create policy favorites_delete_owner on public.favorites
for delete to authenticated
using (patient_id = auth.uid() or public.is_admin());

drop policy if exists notifications_select_owner on public.notifications;
create policy notifications_select_owner on public.notifications
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_update_owner on public.notifications;
create policy notifications_update_owner on public.notifications
for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_delete_owner on public.notifications;
create policy notifications_delete_owner on public.notifications
for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mission_docs',
  'mission_docs',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_public_read on storage.objects;

drop policy if exists avatars_insert_own_folder on storage.objects;
create policy avatars_insert_own_folder on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists avatars_update_own_folder on storage.objects;
create policy avatars_update_own_folder on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text)
with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists avatars_delete_own_folder on storage.objects;
create policy avatars_delete_own_folder on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists mission_docs_select_authorized on storage.objects;
create policy mission_docs_select_authorized on storage.objects
for select to authenticated
using (bucket_id = 'mission_docs' and public.can_access_mission_document(name));

drop policy if exists mission_docs_insert_own_folder on storage.objects;
create policy mission_docs_insert_own_folder on storage.objects
for insert to authenticated
with check (
  bucket_id = 'mission_docs'
  and public.is_active_user()
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists mission_docs_delete_own_folder on storage.objects;
create policy mission_docs_delete_own_folder on storage.objects
for delete to authenticated
using (
  bucket_id = 'mission_docs'
  and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin())
);

revoke all on function public.current_profile_role() from public, anon;
revoke all on function public.is_active_user() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_verified_professional() from public, anon;
revoke all on function public.is_mission_owner(uuid) from public, anon;
revoke all on function public.is_mission_participant(uuid) from public, anon;
revoke all on function public.can_access_profile(uuid) from public, anon;
revoke all on function public.can_access_mission_document(text) from public, anon;
revoke all on function public.list_available_missions() from public, anon;
revoke all on function public.get_public_professionals(uuid) from public, anon;
revoke all on function public.accept_mission_applicant(uuid, uuid) from public, anon;
revoke all on function public.reject_mission_applicant(uuid, uuid) from public, anon;
revoke all on function public.update_mission_status(uuid, text) from public, anon;

-- Trigger functions are invoked by PostgreSQL, never through the public API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.normalize_chat_message() from public, anon, authenticated;
revoke all on function public.notify_chat_message() from public, anon, authenticated;
revoke all on function public.notify_mission_application() from public, anon, authenticated;
revoke all on function public.notify_mission_assignment() from public, anon, authenticated;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_verified_professional() to authenticated;
grant execute on function public.is_mission_owner(uuid) to authenticated;
grant execute on function public.is_mission_participant(uuid) to authenticated;
grant execute on function public.can_access_profile(uuid) to authenticated;
grant execute on function public.can_access_mission_document(text) to authenticated;
grant execute on function public.list_available_missions() to authenticated;
grant execute on function public.get_public_professionals(uuid) to authenticated;
grant execute on function public.accept_mission_applicant(uuid, uuid) to authenticated;
grant execute on function public.reject_mission_applicant(uuid, uuid) to authenticated;
grant execute on function public.update_mission_status(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
