// ── Patient Profile ──
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { CITIES } from '../../utils/constants';
import { User, MapPin, Phone, Mail, Save, LogOut } from 'lucide-react';

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

  // Sync state if user data changes (e.g. after refresh or update completion)
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
      <div className="profile-header">
        <div className="avatar avatar-xl">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
        <div className="profile-name">{user?.firstName} {user?.lastName}</div>
        <div className="profile-role">Patient / Famille</div>
      </div>

      <div className="profile-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div className="profile-section-title" style={{ margin: 0 }}>
            <User size={18} /> Informations personnelles
          </div>
          <button className={`btn btn-sm ${editing ? 'btn-primary btn-glow' : 'btn-secondary'}`}
            onClick={() => editing ? handleSave() : setEditing(true)}>
            {editing ? <><Save size={14} /> Sauver</> : 'Modifier'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Prénom</label>
              <input className="form-input" value={form.firstName} disabled={!editing}
                onChange={e => update('firstName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nom</label>
              <input className="form-input" value={form.lastName} disabled={!editing}
                onChange={e => update('lastName', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Téléphone</label>
            <input className="form-input" value={form.phone} disabled={!editing}
              onChange={e => update('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={user?.email || ''} disabled />
          </div>
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-title"><MapPin size={18} /> Adresse</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Rue</label>
            <input className="form-input" value={form.address.street} disabled={!editing}
              onChange={e => update('address.street', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Ville</label>
              <select className="form-input form-select" value={form.address.city} disabled={!editing}
                onChange={e => update('address.city', e.target.value)}>
                <option value="">Sélectionner</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Code postal</label>
              <input className="form-input" value={form.address.postalCode} disabled={!editing}
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
