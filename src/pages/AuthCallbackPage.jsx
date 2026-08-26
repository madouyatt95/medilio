import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo-medilio.png';

function dashboardPath(role) {
  if (role === 'admin') return '/admin';
  if (role === 'professional') return '/pro/dashboard';
  if (role === 'establishment') return '/etab/dashboard';
  return '/patient/dashboard';
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate(dashboardPath(user.role), { replace: true });
  }, [navigate, user]);

  return (
    <div className="auth-page">
      <div className="auth-card animate-fadeIn" style={{ textAlign: 'center' }}>
        <img src={logo} alt="Medilio" style={{ height: '64px', width: 'auto', marginBottom: 'var(--space-4)' }} />
        {user ? (
          <>
            <div className="spinner" style={{ margin: '0 auto var(--space-4)' }} />
            <h1 style={{ fontSize: 'var(--font-xl)' }}>Adresse confirmée</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Ouverture de votre espace sécurisé…</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 'var(--font-xl)', marginBottom: 'var(--space-3)' }}>Lien invalide ou expiré</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
              Revenez à la connexion ou utilisez le lien le plus récent reçu par e-mail.
            </p>
            <Link className="btn btn-secondary btn-block" to="/login">Retour à la connexion</Link>
          </>
        )}
      </div>
    </div>
  );
}
