import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../supabase/migrations/20260825190000_initial_secure_schema.sql', import.meta.url),
  'utf8',
).toLowerCase();
const surfaceMigration = readFileSync(
  new URL('../supabase/migrations/20260825202000_reduce_public_surface.sql', import.meta.url),
  'utf8',
).toLowerCase();
const adminRoleMigration = readFileSync(
  new URL('../supabase/migrations/20260826203000_admin_role_management.sql', import.meta.url),
  'utf8',
).toLowerCase();

describe('Supabase security baseline', () => {
  it('enables RLS for every application table', () => {
    for (const table of [
      'profiles', 'managed_patients', 'missions', 'mission_applicants',
      'mission_care_notes', 'ratings', 'chats', 'chat_messages',
      'favorites', 'notifications', 'email_dispatches',
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it('does not restore the former broad authenticated policies', () => {
    expect(migration).not.toContain('authenticated users can select all');
    expect(migration).not.toContain("auth.role() = 'authenticated'");
  });

  it('prevents self-registration as administrator', () => {
    expect(migration).toContain("requested_role not in ('patient', 'professional', 'establishment')");
    expect(migration).not.toContain("requested_role not in ('patient', 'professional', 'establishment', 'admin')");
  });

  it('keeps medical documents private and redacts open missions', () => {
    expect(migration).toContain("'mission_docs',\n  'mission_docs',\n  false");
    expect(migration).toContain('create or replace function public.list_available_missions()');
    expect(migration).toContain("'[]'::jsonb");
  });

  it('deduplicates application emails per applicant', () => {
    expect(migration).toContain(
      'on public.email_dispatches (event, mission_id, recipient_id, requested_by)',
    );
  });

  it('does not allow clients to insert their own notifications', () => {
    expect(migration).not.toMatch(/create policy[^;]+on public\.notifications\s+for insert/s);
  });

  it('limits privileged RPC execution to authenticated users', () => {
    expect(migration).toContain('revoke all on function public.accept_mission_applicant(uuid, uuid) from public, anon');
    expect(migration).toContain('revoke all on function public.list_available_missions() from public, anon');
    expect(migration).toContain('grant execute on function public.accept_mission_applicant(uuid, uuid) to authenticated');
  });

  it('does not expose internal trigger functions through the API', () => {
    for (const functionName of [
      'handle_new_user', 'normalize_chat_message', 'notify_chat_message',
      'notify_mission_application', 'notify_mission_assignment',
    ]) {
      expect(surfaceMigration).toContain(
        `revoke all on function public.${functionName}() from public, anon, authenticated`,
      );
    }
  });

  it('prevents anonymous listing of all avatar objects', () => {
    expect(migration).not.toContain('create policy avatars_public_read');
    expect(surfaceMigration).toContain('drop policy if exists avatars_public_read on storage.objects');
  });

  it('limits administrator promotion to authenticated administrators', () => {
    expect(adminRoleMigration).toContain('create or replace function public.promote_user_to_admin(p_user_id uuid)');
    expect(adminRoleMigration).toContain('auth.uid() is null or not public.is_admin()');
    expect(adminRoleMigration).toContain('revoke all on function public.promote_user_to_admin(uuid) from public, anon');
    expect(adminRoleMigration).toContain('grant execute on function public.promote_user_to_admin(uuid) to authenticated');
  });

  it('records administrator promotions in a protected audit table', () => {
    expect(adminRoleMigration).toContain('create table if not exists public.admin_role_audit');
    expect(adminRoleMigration).toContain('alter table public.admin_role_audit enable row level security');
    expect(adminRoleMigration).toContain('insert into public.admin_role_audit (actor_id, target_id, previous_role)');
    expect(adminRoleMigration).toContain('using (public.is_admin())');
    expect(adminRoleMigration).toContain('revoke all on table public.admin_role_audit from anon, authenticated');
  });
});
