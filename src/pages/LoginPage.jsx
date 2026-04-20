// ── Login Page ──
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Mail, Lock, Activity } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const u = await login(email, password);
      if (u.role === 'admin') navigate('/admin');
      else if (u.role === 'professional') navigate('/pro/dashboard');
      else navigate('/patient/dashboard');
    } catch {
      // error is set in context
    }
  };

  const handleQuickLogin = async (e, qEmail, qPassword) => {
    e.preventDefault();
    e.stopPropagation();
    setEmail(qEmail);
    setPassword(qPassword);
    clearError();
    try {
      const u = await login(qEmail, qPassword);
      if (u.role === 'admin') navigate('/admin');
      else if (u.role === 'professional') navigate('/pro/dashboard');
      else navigate('/patient/dashboard');
    } catch (err) {
      console.error('Quick login failed', err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fadeIn">
        <div className="auth-header">
          <div className="auth-logo">
            <Activity size={28} />
            Medilio
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Connectez-vous à votre compte
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--color-danger-light)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-sm)',
              fontWeight: 500,
            }}>
              {error}
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

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (
              <>
                <LogIn size={18} />
                Se connecter
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">ou</div>

        <div className="glass-panel" style={{
          padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
          marginTop: 'var(--space-4)'
        }}>
          <strong style={{ display: 'block', marginBottom: 'var(--space-3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>
            ⚡️ Connexion Instantanée (Mode Démo)
          </strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className="btn btn-sm btn-secondary btn-block" 
              onClick={(e) => handleQuickLogin(e, 'famille.dupont@email.fr', 'patient123')}
              style={{ justifyContent: 'flex-start', background: 'rgba(255,255,255,0.5)' }}
            >
              👩‍🦱 Marie (Patient)
            </button>
            <button 
              className="btn btn-sm btn-secondary btn-block" 
              onClick={(e) => handleQuickLogin(e, 'lucas.infirmier@email.fr', 'pro123')}
              style={{ justifyContent: 'flex-start', background: 'rgba(255,255,255,0.5)' }}
            >
              👨‍⚕️ Lucas (Infirmier)
            </button>
            <button 
              className="btn btn-sm btn-secondary btn-block" 
              onClick={(e) => handleQuickLogin(e, 'admin@medilio.fr', 'admin123')}
              style={{ justifyContent: 'flex-start', background: 'rgba(255,255,255,0.5)' }}
            >
              🛠 Admin
            </button>
          </div>
        </div>

        <div className="auth-footer">
          Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </div>
      </div>
    </div>
  );
}
