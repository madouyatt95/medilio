import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sourceFiles = globSync('src/**/*.{js,jsx}', { cwd: process.cwd() });
const applicationSource = sourceFiles
  .filter(file => !file.endsWith('utils/demoData.js') && !file.endsWith('main.jsx'))
  .map(file => readFileSync(file, 'utf8'))
  .join('\n');
const runtimeSource = readFileSync('src/config/runtime.js', 'utf8');
const entrySource = readFileSync('src/main.jsx', 'utf8');
const emailFunctionSource = readFileSync('supabase/functions/send-email/index.ts', 'utf8');

describe('production boundary', () => {
  it('allows demo mode only in a development build', () => {
    expect(runtimeSource).toContain('import.meta.env.DEV');
    expect(runtimeSource).toContain("requestedMode === 'demo'");
  });

  it('does not import the demo seeder from application screens', () => {
    expect(applicationSource).not.toContain("utils/demoData");
    expect(entrySource).toContain("if (import.meta.env.DEV && import.meta.env.VITE_APP_MODE === 'demo')");
    expect(entrySource).toContain("await import('./utils/demoData')");
  });

  it('does not ship the previous hard-coded demo identities', () => {
    expect(applicationSource).not.toContain('pro-0000-0000-0000-000000000001');
    expect(applicationSource).not.toContain('Dr. Martin Dubois');
    expect(applicationSource).not.toContain('Cabinet Moreau');
  });

  it('keeps health details and mission identifiers out of transactional emails', () => {
    expect(emailFunctionSource).not.toContain('${mission.care_type}');
    expect(emailFunctionSource).not.toContain('${mission.scheduled_date}');
    expect(emailFunctionSource).not.toContain('${mission.scheduled_time}');
    expect(emailFunctionSource).not.toContain('/mission/${mission.id}');
    expect(emailFunctionSource).toContain('votre espace sécurisé Medilio');
  });

  it('checks origin and authentication before exposing provider configuration', () => {
    expect(emailFunctionSource.indexOf("Origine non autorisée."))
      .toBeLessThan(emailFunctionSource.indexOf("request.method === 'OPTIONS'"));
    expect(emailFunctionSource.indexOf("Authentification requise."))
      .toBeLessThan(emailFunctionSource.indexOf("Service email non configuré."));
  });
});
