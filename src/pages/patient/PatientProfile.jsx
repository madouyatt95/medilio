// ── Patient Profile ──
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { CITIES } from '../../utils/constants';
import { User, MapPin, Phone, Mail, Save, LogOut, Edit3 } from 'lucide-react';

export default function PatientProfile() {
  const { user, updateProfile, logout } = useAuth();
  const { showToast } = useNotifications();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      postalCode: user?.address?.postalCode || '',
    },
  });

  // Sync state when user data loads/changes
  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          postalCode: user.address?.postalCode || '',
        },
      });
    }
  }, [user]);

  const update = (key, value) => {
    if (key.startsWith('address.')) {
      const field = key.split('.')[1];
      setForm(p => ({ ...p, address: { ...p.address, [field]: value } }));
    } else {
      setForm(p => ({ ...p, [key]: value }));
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile(form);
      setEditing(false);
      showToast('Profil mis à jour !', 'success');
    } catch (err) {
      showToast(err.message || 'Erreur lors de la mise à jour', 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Hero Header with background image */}
      <div style={{
        marginTop: 'calc(var(--header-height) * -1)',
        marginLeft: 'calc(var(--content-padding) * -1)',
        marginRight: 'calc(var(--content-padding) * -1)',
        height: '200px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, white 100%)' }} />
      </div>

      {/* Avatar + Name - overlapping hero */}
      <div style={{
        position: 'relative', zIndex: 3, marginTop: '-70px',
        textAlign: 'center', paddingBottom: 'var(--space-5)',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <div className="avatar avatar-xl" style={{
          border: '4px solid white', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          marginBottom: 'var(--space-3)', width: '100px', height: '100px', fontSize: '32px'
        }}>
          {user?.firstName?.[0] || 'P'}{user?.lastName?.[0] || ''}
        </div>
        <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
          {user?.firstName || 'Patient'} {user?.lastName || ''}
        </h2>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Patient / Famille
        </div>
      </div>

      {/* Floating Edit/Save Button */}
      <div style={{ position: 'fixed', bottom: 'calc(var(--bottom-nav-height) + 16px)', right: '16px', zIndex: 100 }}>
        <button
          className={`btn btn-lg ${editing ? 'btn-primary btn-glow' : 'btn-secondary'}`}
          style={{ borderRadius: '99px', padding: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
          onClick={() => editing ? handleSave() : setEditing(true)}
        >
          {editing ? <Save size={24} /> : <Edit3 size={24} />}
        </button>
      </div>

      {/* Personal Info Card */}
      <div className="profile-section">
        <div className="profile-section-title">
          <User size={18} /> Informations personnelles
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Prénom</label>
              <input className="form-input" value={form?.firstName || ''} disabled={!editing}
                onChange={e => update('firstName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nom</label>
              <input className="form-input" value={form?.lastName || ''} disabled={!editing}
                onChange={e => update('lastName', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Téléphone</label>
            <input className="form-input" value={form?.phone || ''} disabled={!editing}
              onChange={e => update('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={user?.email || ''} disabled />
          </div>
        </div>
      </div>

      {/* Address Card */}
      <div className="profile-section">
        <div className="profile-section-title"><MapPin size={18} /> Adresse</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Rue</label>
            <input className="form-input" value={form?.address?.street || ''} disabled={!editing}
              onChange={e => update('address.street', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Ville</label>
              <select className="form-input form-select" value={form?.address?.city || ''} disabled={!editing}
                onChange={e => update('address.city', e.target.value)}>
                <option value="">Sélectionner</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Code postal</label>
              <input className="form-input" value={form?.address?.postalCode || ''} disabled={!editing}
                onChange={e => update('address.postalCode', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-ghost btn-block" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-4)' }}
        onClick={logout}>
        <LogOut size={18} /> Se déconnecter
      </button>
    </div>
  );
}
