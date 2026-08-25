import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../supabase/migrations/20260825190000_initial_secure_schema.sql', import.meta.url),
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
});
