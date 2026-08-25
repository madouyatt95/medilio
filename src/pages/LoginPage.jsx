// ── Login Page ──
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Mail, Lock } from 'lucide-react';
import logo from '../assets/logo-medilio.png';
import { isDemoMode } from '../config/runtime';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, configurationError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigateAfterLogin = (account) => {
    if (account.role === 'admin') navigate('/admin');
    else if (account.role === 'professional') navigate('/pro/dashboard');
    else if (account.role === 'establishment') navigate('/etab/dashboard');
    else navigate('/patient/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const u = await login(email, password);
      navigateAfterLogin(u);
    } catch {
      // error is set in context
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    clearError();
    try {
      navigateAfterLogin(await login(demoEmail, demoPassword));
    } catch {
      // error is set in context
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fadeIn">
        <div className="auth-header">
          <div className="auth-logo" style={{ flexDirection: 'column', gap: '12px' }}>
            <img src={logo} alt="Medilio" style={{ height: '64px', width: 'auto' }} />
            <span style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>Medilio</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Connectez-vous à votre compte
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {(error || configurationError) && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--color-danger-light)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-sm)',
              fontWeight: 500,
            }}>
              {error || configurationError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input
                className="form-input"
                type="email"
                placeholder="votre@email.fr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ paddingLeft: 44 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input
                className="form-input"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingLeft: 44 }}
              />
            </div>
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading || Boolean(configurationError)}>
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (
              <>
                <LogIn size={18} />
                Se connecter
              </>
            )}
          </button>
        </form>

        {isDemoMode && (
          <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-light)' }}>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-3)' }}>
              Parcours de validation
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDemoLogin('famille.dupont@email.fr', 'patient123')}>Patient</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDemoLogin('claire.infirmiere@email.fr', 'pro123')}>Professionnel</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDemoLogin('clinique.pasteur@email.fr', 'etab123')}>Établissement</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDemoLogin('admin@medilio.fr', 'admin123')}>Administration</button>
            </div>
          </div>
        )}

        <div className="auth-footer">
          Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </div>
      </div>
    </div>
  );
}
