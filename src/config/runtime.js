const requestedMode = import.meta.env.VITE_APP_MODE;

export const isDemoMode = import.meta.env.DEV && requestedMode === 'demo';
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const isBackendConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const runtimeConfigurationError = !isDemoMode && !isBackendConfigured
  ? 'La connexion sécurisée à Medilio est momentanément indisponible. Réessayez plus tard.'
  : '';

export function assertBackendConfigured() {
  if (!isBackendConfigured) {
    throw new Error('Le service de données Medilio n’est pas configuré.');
  }
}
