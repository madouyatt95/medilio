// ── Register Page ──
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Mail, Lock, User, Phone, Activity, Heart, Stethoscope, Building2, MapPin } from 'lucide-react';
import { ESTABLISHMENT_TYPES } from '../utils/constants';
import logo from '../assets/logo-medilio.png';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuth();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '', role: 'patient',
    street: '', city: '', postalCode: '',
    establishmentName: '', establishmentType: '', finessNumber: '', service: '',
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const user = await register(form);
      if (user.role === 'professional') navigate('/pro/dashboard');
      else if (user.role === 'establishment') navigate('/etab/dashboard');
      else navigate('/patient/dashboard');
    } catch {
      // error set in context
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
            Créez votre compte gratuitement
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: '12px 16px', background: 'var(--color-danger-light)',
              color: 'var(--color-danger)', borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-sm)', fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="form-group">
            <label className="form-label">Je suis</label>
            <div className="role-selector">
              <div
                className={`role-option ${form.role === 'patient' ? 'selected' : ''}`}
                onClick={() => update('role', 'patient')}
              >
                <div className="role-option-icon"><Heart size={22} /></div>
                <div className="role-option-label">Patient / Famille</div>
              </div>
              <div
                className={`role-option ${form.role === 'professional' ? 'selected' : ''}`}
                onClick={() => update('role', 'professional')}
              >
                <div className="role-option-icon"><Stethoscope size={22} /></div>
                <div className="role-option-label">Pro / Intervenant</div>
              </div>
              <div
                className={`role-option ${form.role === 'establishment' ? 'selected' : ''}`}
                onClick={() => update('role', 'establishment')}
              >
                <div className="role-option-icon"><Building2 size={22} /></div>
                <div className="role-option-label">Établissement</div>
              </div>
            </div>
          </div>

          {form.role === 'establishment' && (
            <>
              <div className="form-group">
                <label className="form-label">Nom de l'établissement *</label>
                <input className="form-input" placeholder="Clinique Pasteur" value={form.establishmentName}
                  onChange={e => update('establishmentName', e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={form.establishmentType} onChange={e => update('establishmentType', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {ESTABLISHMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">N° FINESS</label>
                  <input className="form-input" placeholder="Optionnel" value={form.finessNumber}
                    onChange={e => update('finessNumber', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Service / Département</label>
                <input className="form-input" placeholder="Ex: Gériatrie, Cardiologie..." value={form.service}
                  onChange={e => update('service', e.target.value)} />
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Prénom</label>
              <input className="form-input" placeholder="Prénom" value={form.firstName}
                onChange={e => update('firstName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nom</label>
              <input className="form-input" placeholder="Nom" value={form.lastName}
                onChange={e => update('lastName', e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input className="form-input" type="email" placeholder="votre@email.fr"
                value={form.email} onChange={e => update('email', e.target.value)} required
                style={{ paddingLeft: 44 }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Téléphone</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input className="form-input" type="tel" placeholder="06 12 34 56 78"
                value={form.phone} onChange={e => update('phone', e.target.value)}
                style={{ paddingLeft: 44 }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Adresse (Rue/Voie) *</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input className="form-input" placeholder="12 Rue de la Paix"
                value={form.street} onChange={e => update('street', e.target.value)} required
                style={{ paddingLeft: 44 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Code Postal *</label>
              <input className="form-input" placeholder="75002"
                value={form.postalCode} onChange={e => update('postalCode', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Ville *</label>
              <input className="form-input" placeholder="Paris"
                value={form.city} onChange={e => update('city', e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input className="form-input" type="password" placeholder="Min. 6 caractères"
                value={form.password} onChange={e => update('password', e.target.value)} required
                minLength={6} style={{ paddingLeft: 44 }} />
            </div>
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (
              <>
                <UserPlus size={18} />
                Créer mon compte
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
