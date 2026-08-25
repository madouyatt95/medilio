// ── Auth Context (Supabase) ──
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import authService from '../services/authService';
import { runtimeConfigurationError } from '../config/runtime';
import { withTimeout } from '../utils/async';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start true - checking session
  const [error, setError] = useState('');

  // Check for existing session on mount
  useEffect(() => {
    let mounted = true;
    let authGeneration = 0;

    async function initSession() {
      try {
        const profile = await withTimeout(authService.getCurrentUser(), {
          message: 'La vérification de session a expiré.',
        });
        if (mounted) setUser(profile);
      } catch (sessionError) {
        console.warn('Session Medilio indisponible', sessionError);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = authService.onAuthStateChange(
      (event, session) => {
        authGeneration += 1;
        const generation = authGeneration;
        if (event === 'SIGNED_IN' && session?.user) {
          queueMicrotask(async () => {
            try {
              const profile = await withTimeout(authService.getProfile(session.user.id), {
                message: 'Le profil met trop de temps à répondre.',
              });
              if (mounted && generation === authGeneration) setUser(profile);
            } catch (profileError) {
              console.error('Impossible de charger le profil après connexion', profileError);
            }
          });
        } else if (event === 'SIGNED_OUT') {
          if (mounted) setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const u = await withTimeout(authService.login(email, password), {
        message: 'La connexion met trop de temps à répondre. Vérifiez votre réseau puis réessayez.',
      });
      setUser(u);
      return u;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data) => {
    setLoading(true);
    setError('');
    try {
      const result = await withTimeout(authService.register(data), {
        message: 'La création du compte met trop de temps à répondre. Réessayez dans un instant.',
      });
      if (result.profile) setUser(result.profile);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await withTimeout(authService.logout(), {
        timeout: 8_000,
        message: 'La déconnexion distante a expiré.',
      });
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return;
    const updated = await withTimeout(authService.updateProfile(user.id, updates));
    setUser(updated);
    return updated;
  }, [user]);

  const clearError = useCallback(() => setError(''), []);

  // Show a loading screen while checking session
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-primary, #0f172a)',
        color: 'var(--text-primary, #fff)', fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#3b82f6', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <div style={{ fontSize: '1.1rem', opacity: 0.7 }}>Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user, loading, error,
      configurationError: runtimeConfigurationError,
      login, register, logout, updateProfile, clearError,
      isAuthenticated: !!user,
      isPatient: user?.role === 'patient',
      isProfessional: user?.role === 'professional',
      isAdmin: user?.role === 'admin',
      isEstablishment: user?.role === 'establishment',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
