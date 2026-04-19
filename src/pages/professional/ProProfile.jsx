// ── Professional Profile ── (Mockup-faithful design)
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { SPECIALTIES, CITIES } from '../../utils/constants';
import missionService from '../../services/missionService';
import {
  User, MapPin, Clock, Stethoscope, Save, LogOut,
  CheckCircle, Shield, Edit3, Star, Award, Briefcase
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
      serviceArea: {
        city: user?.professionalInfo?.serviceArea?.city || '',
        radius: user?.professionalInfo?.serviceArea?.radius || 20
      },
      availability: {
        days: user?.professionalInfo?.availability?.days || [],
        hours: {
          start: user?.professionalInfo?.availability?.hours?.start || '08:00',
          end: user?.professionalInfo?.availability?.hours?.end || '18:00'
        }
      },
      bio: user?.professionalInfo?.bio || '',
      verified: user?.professionalInfo?.verified || false,
    },
  });

  const [completedCount, setCompletedCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    async function loadStats() {
      if (user) {
        try {
          const missions = await missionService.getByProfessional(user.id);
          const completed = missions.filter(m => m.status === 'completed');
          setCompletedCount(completed.length);
          setTotalEarnings(completed.reduce((sum, m) => sum + (Number(m.estimatedCost) || 0), 0));
        } catch (e) {
          console.warn('Could not load stats', e);
        }
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
    const current = form?.professionalInfo?.specialties || [];
    const updated = current.includes(spec)
      ? current.filter(s => s !== spec)
      : [...current, spec];
    updateField('professionalInfo.specialties', updated);
  };

  const toggleDay = (day) => {
    const current = form?.professionalInfo?.availability?.days || [];
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

  const SPEC_ICONS = ['💊', '🩺', '🫀', '🦴', '👶', '🧠'];

  return (
    <div className="page-container" style={{ background: 'transparent' }}>
      {/* Hero Photo — Full Bleed like mockup */}
      <div style={{
        marginTop: 'calc((var(--header-height) + var(--space-4)) * -1)',
        marginLeft: 'calc(var(--content-padding) * -1)',
        marginRight: 'calc(var(--content-padding) * -1)',
        height: '300px',
        background: 'url(https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80) center top/cover',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 30%, white 100%)',
        }} />
      </div>

      {/* Name, Rating, Badge — overlapping the photo */}
      <div style={{ position: 'relative', zIndex: 3, marginTop: '-60px', paddingBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {user?.firstName || 'Pro'} {user?.lastName || ''}
        </h1>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
          {(form?.professionalInfo?.specialties || [])[0] || 'Professionnel de santé'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          {form?.professionalInfo?.verified ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '4px 12px', borderRadius: 'var(--radius-full)',
              background: '#D1FAE5', color: '#065F46', fontSize: 'var(--font-xs)', fontWeight: 600
            }}>
              <Shield size={14} /> Vérifié
            </span>
          ) : (
            <span className="badge badge-assigned">En attente de vérification</span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)',
        marginBottom: 'var(--space-6)',
      }}>
        {[
          { icon: <Briefcase size={20} />, value: completedCount, label: 'Missions', color: '#2563EB', bg: '#DBEAFE' },
          { icon: <Star size={20} />, value: '4.9', label: 'Note', color: '#F59E0B', bg: '#FEF3C7' },
          { icon: <Award size={20} />, value: `${totalEarnings}€`, label: 'Revenus', color: '#10B981', bg: '#D1FAE5' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3)', textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border-light)',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
              background: stat.bg, color: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-2)',
            }}>{stat.icon}</div>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Floating Action Button */}
      <div style={{ position: 'fixed', bottom: 'calc(var(--bottom-nav-height) + 16px)', right: '16px', zIndex: 100 }}>
        <button
          className={`btn btn-lg ${editing ? 'btn-primary btn-glow' : 'btn-secondary'}`}
          style={{ borderRadius: '99px', padding: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
          onClick={() => editing ? handleSave() : setEditing(true)}
        >
          {editing ? <Save size={24} /> : <Edit3 size={24} />}
        </button>
      </div>

      {/* Specialties — with emoji icons like the mockup */}
      <div className="profile-section">
        <div className="profile-section-title"><Stethoscope size={18} /> Spécialités</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)',
        }}>
          {SPECIALTIES.map((spec, i) => {
            const isSelected = (form?.professionalInfo?.specialties || []).includes(spec);
            return (
              <div key={spec}
                onClick={() => editing && toggleSpecialty(spec)}
                style={{
                  background: isSelected ? '#DBEAFE' : 'var(--bg-input)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3)',
                  textAlign: 'center',
                  cursor: editing ? 'pointer' : 'default',
                  border: isSelected ? '2px solid #2563EB' : '2px solid transparent',
                  opacity: editing && !isSelected ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{SPEC_ICONS[i % SPEC_ICONS.length]}</div>
                <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {spec.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bio */}
      <div className="profile-section">
        <div className="profile-section-title"><User size={18} /> Bio</div>
        <textarea className="form-input form-textarea" value={form?.professionalInfo?.bio || ''}
          disabled={!editing} placeholder="Décrivez votre expérience..."
          style={{ minHeight: '80px' }}
          onChange={e => updateField('professionalInfo.bio', e.target.value)} />
      </div>

      {/* Personal Info */}
      <div className="profile-section">
        <div className="profile-section-title"><User size={18} /> Informations</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Prénom</label>
            <input className="form-input" value={form?.firstName || ''} disabled={!editing}
              onChange={e => updateField('firstName', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Nom</label>
            <input className="form-input" value={form?.lastName || ''} disabled={!editing}
              onChange={e => updateField('lastName', e.target.value)} />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
          <label className="form-label">Téléphone</label>
          <input className="form-input" value={form?.phone || ''} disabled={!editing}
            onChange={e => updateField('phone', e.target.value)} />
        </div>
      </div>

      {/* Service Area */}
      <div className="profile-section">
        <div className="profile-section-title"><MapPin size={18} /> Zone d'intervention</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Ville</label>
            <select className="form-input form-select" disabled={!editing}
              value={form?.professionalInfo?.serviceArea?.city || ''}
              onChange={e => updateField('professionalInfo.serviceArea.city', e.target.value)}>
              <option value="">Sélectionner</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Rayon ({form?.professionalInfo?.serviceArea?.radius || 0} km)</label>
            <input type="range" min="5" max="100" step="5" disabled={!editing}
              value={form?.professionalInfo?.serviceArea?.radius || 20}
              onChange={e => updateField('professionalInfo.serviceArea.radius', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary)', marginTop: 8 }} />
          </div>
        </div>
      </div>

      {/* Availability — Day pills + time pickers like mockup */}
      <div className="profile-section">
        <div className="profile-section-title"><Clock size={18} /> Disponibilités</div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
          {DAYS.map(day => {
            const isDaySelected = (form?.professionalInfo?.availability?.days || []).includes(day.id);
            return (
              <button key={day.id}
                onClick={() => editing && toggleDay(day.id)}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-full)',
                  background: isDaySelected ? 'var(--color-primary)' : 'var(--bg-input)',
                  color: isDaySelected ? 'white' : 'var(--text-secondary)',
                  border: 'none', fontWeight: 600, fontSize: 'var(--font-sm)',
                  cursor: editing ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
              >
                {day.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">De</label>
            <input className="form-input" type="time" disabled={!editing}
              value={form?.professionalInfo?.availability?.hours?.start || '08:00'}
              onChange={e => updateField('professionalInfo.availability.hours.start', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">À</label>
            <input className="form-input" type="time" disabled={!editing}
              value={form?.professionalInfo?.availability?.hours?.end || '18:00'}
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
