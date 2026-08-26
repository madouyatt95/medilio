import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import logo from '../assets/logo-medilio.png';

function dashboardPath(role) {
  if (role === 'admin') return '/admin';
  if (role === 'professional') return '/pro/dashboard';
  if (role === 'establishment') return '/etab/dashboard';
  return '/patient/dashboard';
}

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const { user, configurationError } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 12) {
      setError('Choisissez un mot de passe d’au moins 12 caractères.');
      return;
    }
    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsSaving(true);
    try {
      await authService.updatePassword(password);
      navigate(dashboardPath(user.role), { replace: true });
    } catch (saveError) {
      console.error('Unable to set invited account password:', saveError);
      setError(saveError.message || 'Le mot de passe n’a pas pu être enregistré. Demandez une nouvelle invitation.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fadeIn">
        <div className="auth-header">
          <div className="auth-logo" style={{ flexDirection: 'column', gap: '12px' }}>
            <img src={logo} alt="Medilio" style={{ height: '64px', width: 'auto' }} />
            <span style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>Activer mon accès</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Choisissez le mot de passe de votre compte Medilio.
          </p>
        </div>

        {!user ? (
          <div className="card" role="alert" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-3)' }}>Lien invalide ou expiré</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
              Ouvrez le lien le plus récent reçu par e-mail ou demandez une nouvelle invitation.
            </p>
            <Link className="btn btn-secondary btn-block" to="/login">Retour à la connexion</Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {(error || configurationError) && (
              <div role="alert" style={{
                padding: '12px 16px', background: 'var(--color-danger-light)', color: 'var(--color-danger)',
                borderRadius: 'var(--radius-md)', fontSize: 'var(--font-sm)', fontWeight: 500,
              }}>
                {error || configurationError}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#ECFDF5', color: '#166534', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-sm)' }}>
              <ShieldCheck size={20} />
              <span>Invitation vérifiée pour <strong>{user.email}</strong></span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-password">Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  id="new-password"
                  className="form-input"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="12 caractères minimum"
                  required
                  style={{ paddingLeft: 44 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">Confirmer le mot de passe</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  id="confirm-password"
                  className="form-input"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={confirmation}
                  onChange={event => setConfirmation(event.target.value)}
                  placeholder="Saisissez-le à nouveau"
                  required
                  style={{ paddingLeft: 44 }}
                />
              </div>
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={isSaving || Boolean(configurationError)}>
              {isSaving ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Activer mon compte'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
