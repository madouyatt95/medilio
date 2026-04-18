// ── Professional Profile ──
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { SPECIALTIES, CITIES } from '../../utils/constants';
import missionService from '../../services/missionService';
import {
  User, MapPin, Clock, Stethoscope, Save, LogOut,
  CheckCircle, Shield, Edit3
} from 'lucide-react';

export default function ProProfile() {
  const { user, updateProfile, logout } = useAuth();
  const { showToast } = useNotifications();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    professionalInfo: {
      specialties: user?.professionalInfo?.specialties || [],
      serviceArea: user?.professionalInfo?.serviceArea || { city: '', radius: 20 },
      availability: user?.professionalInfo?.availability || {
        days: [], hours: { start: '08:00', end: '18:00' }
      },
      bio: user?.professionalInfo?.bio || '',
      verified: user?.professionalInfo?.verified || false,
    },
  });

  const [completedMissions, setCompletedMissions] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    async function loadStats() {
      if (user) {
        const missions = await missionService.getByProfessional(user.id);
        const completed = missions.filter(m => m.status === 'completed');
        setCompletedMissions(completed);
        const earnings = completed.reduce((sum, m) => sum + (Number(m.estimatedCost) || 0), 0);
        setTotalEarnings(earnings);
      }
    }
    loadStats();
  }, [user]);

  const updateField = (path, value) => {
    setForm(prev => {
      const keys = path.split('.');
      const newForm = JSON.parse(JSON.stringify(prev));
      let obj = newForm;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return newForm;
    });
  };

  const toggleSpecialty = (spec) => {
    const current = form.professionalInfo.specialties;
    const updated = current.includes(spec)
      ? current.filter(s => s !== spec)
      : [...current, spec];
    updateField('professionalInfo.specialties', updated);
  };

  const toggleDay = (day) => {
    const current = form.professionalInfo.availability.days;
    const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    updateField('professionalInfo.availability.days', updated);
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

  const DAYS = [
    { id: 'lun', label: 'Lun' }, { id: 'mar', label: 'Mar' },
    { id: 'mer', label: 'Mer' }, { id: 'jeu', label: 'Jeu' },
    { id: 'ven', label: 'Ven' }, { id: 'sam', label: 'Sam' },
    { id: 'dim', label: 'Dim' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{
        margin: 'calc(var(--space-4) * -1) calc(var(--content-padding) * -1) var(--space-5)',
        padding: 'var(--space-8) var(--content-padding) var(--space-5)',
        background: 'url(https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80) center/cover',
        position: 'relative',
        color: 'white',
        borderBottomLeftRadius: 'var(--radius-xl)',
        borderBottomRightRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)', borderRadius: 'inherit', zIndex: 1 }} />
        
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="avatar avatar-xl" style={{ border: '4px solid white', boxShadow: 'var(--shadow-lg)', marginBottom: 'var(--space-3)' }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {user?.firstName} {user?.lastName}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {form.professionalInfo.verified ? (
              <span className="badge" style={{ background: 'var(--color-success)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Shield size={12} /> Vérifié
              </span>
            ) : (
              <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                En attente
              </span>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ 
          position: 'relative', zIndex: 2, display: 'flex', width: '100%', maxWidth: '400px', 
          marginTop: 'var(--space-5)', padding: 'var(--space-3)', justifyContent: 'space-around', 
          background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.1)' 
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: '#67E8F9' }}>{completedMissions.length}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'rgba(255,255,255,0.8)' }}>Missions</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: '#67E8F9' }}>{totalEarnings}€</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'rgba(255,255,255,0.8)' }}>Revenus</div>
          </div>
        </div>
      </div>

      {/* Edit Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <button className={`btn btn-sm ${editing ? 'btn-primary btn-glow' : 'btn-secondary'}`} onClick={() => editing ? handleSave() : setEditing(true)}>
          {editing ? <><Save size={14} /> Sauvegarder</> : <><Edit3 size={14} /> Modifier mon profil</>}
        </button>
      </div>

      {/* Personal Info */}
      <div className="profile-section">
        <div className="profile-section-title"><User size={18} /> Informations</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Prénom</label>
            <input className="form-input" value={form.firstName} disabled={!editing}
              onChange={e => updateField('firstName', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Nom</label>
            <input className="form-input" value={form.lastName} disabled={!editing}
              onChange={e => updateField('lastName', e.target.value)} />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
          <label className="form-label">Téléphone</label>
          <input className="form-input" value={form.phone} disabled={!editing}
            onChange={e => updateField('phone', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Bio</label>
          <textarea className="form-input form-textarea" value={form.professionalInfo.bio}
            disabled={!editing} placeholder="Décrivez votre expérience..."
            onChange={e => updateField('professionalInfo.bio', e.target.value)} />
        </div>
      </div>

      {/* Specialties */}
      <div className="profile-section">
        <div className="profile-section-title"><Stethoscope size={18} /> Spécialités</div>
        <div className="tags" style={{ gap: 'var(--space-2)' }}>
          {SPECIALTIES.map(spec => (
            <button key={spec}
              className={`tag ${form.professionalInfo.specialties.includes(spec) ? 'tag-success' : ''}`}
              onClick={() => editing && toggleSpecialty(spec)}
              style={{ cursor: editing ? 'pointer' : 'default', opacity: editing && !form.professionalInfo.specialties.includes(spec) ? 0.5 : 1 }}>
              {form.professionalInfo.specialties.includes(spec) && <CheckCircle size={12} />}
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Service Area */}
      <div className="profile-section">
        <div className="profile-section-title"><MapPin size={18} /> Zone d'intervention</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Ville</label>
            <select className="form-input form-select" disabled={!editing}
              value={form.professionalInfo.serviceArea.city}
              onChange={e => updateField('professionalInfo.serviceArea.city', e.target.value)}>
              <option value="">Sélectionner</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Rayon ({form.professionalInfo.serviceArea.radius} km)</label>
            <input type="range" min="5" max="100" step="5" disabled={!editing}
              value={form.professionalInfo.serviceArea.radius}
              onChange={e => updateField('professionalInfo.serviceArea.radius', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary)', marginTop: 8 }} />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="profile-section">
        <div className="profile-section-title"><Clock size={18} /> Disponibilités</div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
          {DAYS.map(day => (
            <button key={day.id}
              className={`tag ${form.professionalInfo.availability.days.includes(day.id) ? 'tag-success' : ''}`}
              onClick={() => editing && toggleDay(day.id)}
              style={{ cursor: editing ? 'pointer' : 'default', padding: '6px 14px' }}>
              {day.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">De</label>
            <input className="form-input" type="time" disabled={!editing}
              value={form.professionalInfo.availability.hours.start}
              onChange={e => updateField('professionalInfo.availability.hours.start', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">À</label>
            <input className="form-input" type="time" disabled={!editing}
              value={form.professionalInfo.availability.hours.end}
              onChange={e => updateField('professionalInfo.availability.hours.end', e.target.value)} />
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
