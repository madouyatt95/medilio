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
const appSource = readFileSync('src/App.jsx', 'utf8');
const stylesSource = readFileSync('src/index.css', 'utf8');
const adminSource = readFileSync('src/pages/admin/AdminDashboard.jsx', 'utf8');
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

  it('keeps all six establishment navigation items reachable on mobile', () => {
    expect(appSource).toContain('bottom-nav bottom-nav-compact');
    expect(stylesSource).toContain('.bottom-nav-compact .bottom-nav-item');
    expect(stylesSource).toContain('flex: 1 1 0');
    expect(stylesSource).toContain('min-width: 0');
  });

  it('does not present fictional admin activity or a non-existent super-admin role', () => {
    expect(adminSource).not.toContain('Super administrateur');
    expect(adminSource).not.toContain('Maintenance programmée');
    expect(adminSource).not.toContain('Notre équipe support est disponible 7j/7.');
    expect(adminSource).not.toContain('Paris 15e');
    expect(adminSource).toContain('recentMissions.map');
    expect(adminSource).toContain('Les données d\'administration n\'ont pas pu être chargées.');
    expect(adminSource).toContain("['professional', 'establishment'].includes(u.role)");
    expect(adminSource).toContain('pendingVerifications.map');
  });

  it('lets an administrator promote an existing active account', () => {
    expect(adminSource).toContain('Ajouter comme administrateur');
    expect(adminSource).toContain('authService.promoteToAdmin(candidate.id)');
    expect(adminSource).toContain("account.role !== 'admin' && !account.disabled");
  });
});
