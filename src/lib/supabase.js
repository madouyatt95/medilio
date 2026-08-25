// ── Supabase Client ──
import { createClient } from '@supabase/supabase-js';
import { isBackendConfigured, supabaseAnonKey, supabaseUrl } from '../config/runtime';

// A non-routable client keeps the module importable for the local-only demo.
// Production screens stop before using it when configuration is missing.
const clientUrl = isBackendConfigured ? supabaseUrl : 'http://127.0.0.1:54321';
const clientKey = isBackendConfigured ? supabaseAnonKey : 'medilio-local-demo';

export const supabase = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: isBackendConfigured,
    autoRefreshToken: isBackendConfigured,
    detectSessionInUrl: isBackendConfigured,
  },
});
export default supabase;
