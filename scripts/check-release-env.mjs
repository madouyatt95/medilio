import { existsSync, readFileSync } from 'node:fs';

const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local'];
const configuration = {};

for (const file of envFiles) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) configuration[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_APP_URL',
  'VITE_LEGAL_OPERATOR',
  'VITE_PRIVACY_CONTACT',
];
const placeholder = /replace-with|à compléter|a-completer|example\.com/i;
const missing = required.filter(key => !configuration[key] || placeholder.test(configuration[key]));

if (configuration.VITE_APP_URL && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configuration.VITE_APP_URL)) {
  missing.push('VITE_APP_URL (doit être une URL HTTPS publique)');
}

if (missing.length) {
  throw new Error(`Configuration de commercialisation incomplète : ${[...new Set(missing)].join(', ')}`);
}

console.log('Configuration frontend de commercialisation complète.');
