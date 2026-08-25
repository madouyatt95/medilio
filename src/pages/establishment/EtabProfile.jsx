// ── Establishment Profile (Dedicated) ──
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import managedPatientService from '../../services/managedPatientService';
import { ESTABLISHMENT_TYPES, CITIES } from '../../utils/constants';
import AvatarUpload from '../../components/AvatarUpload';
import {
  Building2, User, MapPin, Phone, Mail, Save, LogOut, Edit3,
  Shield, Hash, Briefcase, Users, ClipboardList,
  CheckCircle, AlertCircle, Clock
} from 'lucide-react';

export default function EtabProfile() {
  const { user, updateProfile, logout } = useAuth();
  const { showToast } = useNotifications();
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({ missions: 0, patients: 0, completed: 0, active: 0 });

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: { street: '', city: '', postalCode: '' },
    establishmentInfo: {
      name: '',
      type: '',
      finessNumber: '',
      service: '',
    },
  });

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
        establishmentInfo: {
          name: user.establishmentInfo?.name || '',
          type: user.establishmentInfo?.type || '',
          finessNumber: user.establishmentInfo?.finessNumber || '',
          service: user.establishmentInfo?.service || '',
        },
      });
      async function loadStats() {
        try {
          const [etabMissions, patients] = await Promise.all([
            missionService.getByEstablishment(user.id),
            managedPatientService.getByEstablishment(user.id),
          ]);
          setStats({
            missions: etabMissions.length,
            patients: patients.length,
            completed: etabMissions.filter(m => m.status === 'completed').length,
            active: etabMissions.filter(m => ['open', 'assigned', 'in_progress'].includes(m.status)).length,
          });
        } catch (error) {
          console.error('Impossible de charger les statistiques établissement', error);
        }
      }
      void loadStats();
    }
  }, [user]);

  const update = (key, value) => {
    if (key.startsWith('address.')) {
      const field = key.split('.')[1];
      setForm(p => ({ ...p, address: { ...p.address, [field]: value } }));
    } else if (key.startsWith('etab.')) {
      const field = key.split('.')[1];
      setForm(p => ({ ...p, establishmentInfo: { ...p.establishmentInfo, [field]: value } }));
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

  const isVerified = user?.establishmentInfo?.verified;

  return (
    <div className="page-container" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 40px)' }}>
      {/* Hero Header */}
      <div style={{
        marginTop: 'calc(var(--header-height) * -1)',
        marginLeft: 'calc(var(--content-padding) * -1)',
        marginRight: 'calc(var(--content-padding) * -1)',
        height: '180px',
        background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 50%, #2563eb 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, opacity: 0.08 }}>
          <Building2 size={200} color="white" />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, var(--bg-primary) 100%)' }} />
      </div>

      {/* Avatar + Name */}
      <div style={{
        position: 'relative', zIndex: 3, marginTop: '-70px',
        textAlign: 'center', paddingBottom: 'var(--space-4)',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <AvatarUpload user={user} size={100} onUploaded={() => window.location.reload()} />
        </div>
        <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {form.establishmentInfo.name || 'Établissement'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 6 }}>
          {form.establishmentInfo.type && (
            <span style={{
              fontSize: 'var(--font-xs)', background: 'var(--color-primary-light)',
              color: 'var(--color-primary)', padding: '3px 10px', borderRadius: 20,
              fontWeight: 700
            }}>
              {form.establishmentInfo.type}
            </span>
          )}
          {isVerified ? (
            <span style={{
              fontSize: 'var(--font-xs)', background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--color-success)', padding: '3px 10px', borderRadius: 20,
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4
            }}>
              <CheckCircle size={12} /> Vérifié
            </span>
          ) : (
            <span style={{
              fontSize: 'var(--font-xs)', background: 'rgba(245, 158, 11, 0.1)',
              color: 'var(--color-warning)', padding: '3px 10px', borderRadius: 20,
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4
            }}>
              <AlertCircle size={12} /> En attente
            </span>
          )}
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
          Responsable : {user?.firstName} {user?.lastName}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)',
        marginBottom: 'var(--space-5)'
      }}>
        {[
          { label: 'Missions', value: stats.missions, icon: ClipboardList, color: 'var(--color-primary)' },
          { label: 'Patients', value: stats.patients, icon: Users, color: '#8B5CF6' },
          { label: 'En cours', value: stats.active, icon: Clock, color: 'var(--color-warning)' },
          { label: 'Terminées', value: stats.completed, icon: CheckCircle, color: 'var(--color-success)' },
        ].map((s, i) => (
          <div key={i} style={{
            textAlign: 'center', padding: 'var(--space-3)',
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <s.icon size={18} color={s.color} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
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

      {/* Establishment Info */}
      <div className="profile-section">
        <div className="profile-section-title">
          <Building2 size={18} /> Informations de l'établissement
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Nom de l'établissement</label>
            <input className="form-input" value={form.establishmentInfo.name} disabled={!editing}
              onChange={e => update('etab.name', e.target.value)}
              placeholder="Clinique Pasteur" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Type d'établissement</label>
              <select className="form-input form-select" value={form.establishmentInfo.type} disabled={!editing}
                onChange={e => update('etab.type', e.target.value)}>
                <option value="">Sélectionner</option>
                {ESTABLISHMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">N° FINESS</label>
              <div style={{ position: 'relative' }}>
                <Hash size={16} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)'
                }} />
                <input className="form-input" value={form.establishmentInfo.finessNumber} disabled={!editing}
                  onChange={e => update('etab.finessNumber', e.target.value)}
                  placeholder="750012345"
                  style={{ paddingLeft: 36 }} />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Service / Département</label>
            <div style={{ position: 'relative' }}>
              <Briefcase size={16} style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input className="form-input" value={form.establishmentInfo.service} disabled={!editing}
                onChange={e => update('etab.service', e.target.value)}
                placeholder="Gériatrie, Cardiologie..."
                style={{ paddingLeft: 36 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Person */}
      <div className="profile-section">
        <div className="profile-section-title">
          <User size={18} /> Responsable / Contact
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
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
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input className="form-input" value={form.phone} disabled={!editing}
                onChange={e => update('phone', e.target.value)}
                style={{ paddingLeft: 36 }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input className="form-input" value={user?.email || ''} disabled
                style={{ paddingLeft: 36 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="profile-section">
        <div className="profile-section-title"><MapPin size={18} /> Adresse de l'établissement</div>
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

      {/* Verification Status */}
      <div className="profile-section" style={{
        background: isVerified ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)',
        border: `1px solid ${isVerified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
      }}>
        <div className="profile-section-title">
          <Shield size={18} /> Statut de vérification
        </div>
        {isVerified ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
            <CheckCircle size={24} color="var(--color-success)" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>Établissement vérifié</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                Votre établissement a été vérifié par l'équipe Medilio. Les professionnels peuvent voir le badge de confiance sur vos missions.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
            <AlertCircle size={24} color="var(--color-warning)" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-warning)' }}>En attente de vérification</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                Ajoutez votre numéro FINESS afin que l’équipe puisse contrôler votre établissement.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <button className="btn btn-ghost btn-block" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-4)' }}
        onClick={logout}>
        <LogOut size={18} /> Se déconnecter
      </button>
    </div>
  );
}
