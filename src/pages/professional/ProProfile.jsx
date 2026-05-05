// ── Professional Profile ── (With interactive Tabbed Earnings Tracking)
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { SPECIALTIES, EXTENDED_SPECIALTIES, CITIES, CARE_TYPES } from '../../utils/constants';
import missionService from '../../services/missionService';
import ratingService from '../../services/ratingService';
import { RatingDisplay } from '../../components/SharedComponents';
import {
  User, MapPin, Clock, Stethoscope, Save, LogOut,
  CheckCircle, Shield, Edit3, Star, Award, Briefcase, Plus, X,
  TrendingUp, Download, CreditCard, ChevronRight, CheckSquare
} from 'lucide-react';
import AvatarUpload from '../../components/AvatarUpload';
import { formatRelative, formatDate } from '../../utils/dateUtils';

export default function ProProfile() {
  const { user, updateProfile, logout } = useAuth();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState('profil'); // 'profil' or 'revenus'
  const [editing, setEditing] = useState(false);
  const [customSpecialty, setCustomSpecialty] = useState('');
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

  const [completedMissions, setCompletedMissions] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({ average: 0, count: 0 });

  useEffect(() => {
    async function loadStats() {
      if (user) {
        try {
          const missions = await missionService.getByProfessional(user.id);
          const completed = missions.filter(m => m.status === 'completed');
          setCompletedMissions(completed);
          setTotalEarnings(completed.reduce((sum, m) => sum + (Number(m.estimatedCost) || 0), 0));

          const proRatings = await ratingService.getByPro(user.id);
          setRatings(proRatings);
          const proStats = await ratingService.getProAverageRating(user.id);
          setStats(proStats);
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
    <div className="page-container animate-fadeIn" style={{ background: 'transparent', paddingBottom: 'calc(var(--bottom-nav-height) + 40px)' }}>
      {/* Hero Photo — Full Bleed like mockup */}
      <div style={{
        marginTop: 'calc((var(--header-height) + var(--space-4)) * -1)',
        marginLeft: 'calc(var(--content-padding) * -1)',
        marginRight: 'calc(var(--content-padding) * -1)',
        height: '240px',
        background: 'url(https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80) center top/cover',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 30%, #FAFBFD 100%)',
        }} />
      </div>

      {/* Name, Avatar, Badge — overlapping the photo */}
      <div style={{ position: 'relative', zIndex: 3, marginTop: '-60px', paddingBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <AvatarUpload user={user} size={100} onUploaded={() => window.location.reload()} />
        </div>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {user?.firstName || 'Pro'} {user?.lastName || ''}
        </h1>
        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>
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
            <span className="badge badge-assigned" style={{ background: 'var(--color-primary-lighter)', color: 'var(--color-primary)', border: 'none' }}>En attente de vérification</span>
          )}
        </div>
      </div>

      {/* Profile & Earnings Tabs switcher - Premium Segment Control */}
      <div className="profile-tabs animate-fadeIn" style={{ marginBottom: 'var(--space-6)' }}>
        <button 
          className={`profile-tab-btn ${activeTab === 'profil' ? 'active' : ''}`}
          onClick={() => setActiveTab('profil')}
        >
          <User size={15} />
          Mon Profil
        </button>
        <button 
          className={`profile-tab-btn ${activeTab === 'revenus' ? 'active' : ''}`}
          onClick={() => setActiveTab('revenus')}
        >
          <TrendingUp size={15} />
          Mes Revenus
        </button>
      </div>

      {/* ── PROFILE TAB CONTENT ── */}
      {activeTab === 'profil' && (
        <div className="animate-fadeIn">
          {/* Stats Row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)',
            marginBottom: 'var(--space-6)',
          }}>
            {[
              { icon: <Briefcase size={18} />, value: completedMissions.length, label: 'Interventions', color: 'var(--color-primary)', bg: 'rgba(37, 99, 235, 0.08)' },
              { icon: <Star size={18} />, value: stats.average || '4,5', label: 'Note', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' },
              { icon: <Award size={18} />, value: `${totalEarnings}€`, label: 'Revenus', color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.08)' },
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'white', borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-4) var(--space-2)', textAlign: 'center',
                boxShadow: 'var(--shadow-premium)', border: '1px solid var(--border-light)',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: stat.bg, color: stat.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto var(--space-2)',
                }}>{stat.icon}</div>
                <div style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Floating Action Button */}
          <div style={{ position: 'fixed', bottom: 'calc(var(--bottom-nav-height) + 16px)', right: '16px', zIndex: 100 }}>
            <button
              className={`btn btn-lg ${editing ? 'btn-primary btn-glow' : 'btn-secondary'}`}
              style={{ borderRadius: '99px', padding: '16px', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)' }}
              onClick={() => editing ? handleSave() : setEditing(true)}
            >
              {editing ? <Save size={24} /> : <Edit3 size={24} />}
            </button>
          </div>

          {/* Specialties — with emoji icons like the mockup */}
          <div className="profile-section animate-fadeInUp" style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="profile-section-title" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Stethoscope size={18} style={{ color: 'var(--color-primary)' }} /> Spécialités
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
            }}>
              {/* Default and currently selected specialties */}
              {Array.from(new Set([...SPECIALTIES, ...(form?.professionalInfo?.specialties || [])])).map((spec, i) => {
                const isSelected = (form?.professionalInfo?.specialties || []).includes(spec);
                return (
                  <div key={spec}
                    onClick={() => editing && toggleSpecialty(spec)}
                    style={{
                      background: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-input)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '16px 8px',
                      textAlign: 'center',
                      cursor: editing ? 'pointer' : 'default',
                      border: isSelected ? '1.5px solid var(--color-primary)' : '1.5px solid transparent',
                      opacity: editing && !isSelected ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>{SPEC_ICONS[i % SPEC_ICONS.length]}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                      {spec.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
            {editing && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>
                  Suggestions :
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 'var(--space-2)', scrollbarWidth: 'none' }}>
                  {EXTENDED_SPECIALTIES.filter(s => !(form?.professionalInfo?.specialties || []).includes(s)).map(s => (
                    <button key={s} 
                      className="tag" 
                      onClick={() => toggleSpecialty(s)}
                      style={{ whiteSpace: 'nowrap', border: '1px solid var(--border-color)', cursor: 'pointer', background: 'white', borderRadius: '8px' }}
                    >
                      + {s}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Autre spécialité..." 
                    value={customSpecialty}
                    onChange={e => setCustomSpecialty(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customSpecialty.trim()) {
                          toggleSpecialty(customSpecialty.trim());
                          setCustomSpecialty('');
                        }
                      }
                    }}
                    style={{ flex: 1, borderRadius: '10px' }}
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      if (customSpecialty.trim()) {
                        toggleSpecialty(customSpecialty.trim());
                        setCustomSpecialty('');
                      }
                    }}
                    style={{ padding: '0 16px', borderRadius: '10px' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="profile-section animate-fadeInUp" style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="profile-section-title" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}><User size={18} style={{ color: 'var(--color-primary)' }} /> Bio</div>
            <textarea className="form-input form-textarea" value={form?.professionalInfo?.bio || ''}
              disabled={!editing} placeholder="Décrivez votre expérience..."
              style={{ minHeight: '80px', borderRadius: '10px' }}
              onChange={e => updateField('professionalInfo.bio', e.target.value)} />
          </div>

          {/* Personal Info */}
          <div className="profile-section animate-fadeInUp" style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="profile-section-title" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><User size={18} style={{ color: 'var(--color-primary)' }} /> Informations</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Prénom</label>
                <input className="form-input" value={form?.firstName || ''} disabled={!editing} style={{ borderRadius: '10px' }}
                  onChange={e => updateField('firstName', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Nom</label>
                <input className="form-input" value={form?.lastName || ''} disabled={!editing} style={{ borderRadius: '10px' }}
                  onChange={e => updateField('lastName', e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Téléphone</label>
              <input className="form-input" value={form?.phone || ''} disabled={!editing} style={{ borderRadius: '10px' }}
                onChange={e => updateField('phone', e.target.value)} />
            </div>
          </div>

          {/* Service Area */}
          <div className="profile-section animate-fadeInUp" style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="profile-section-title" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><MapPin size={18} style={{ color: 'var(--color-primary)' }} /> Zone d'intervention</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Ville</label>
                <select className="form-input form-select" disabled={!editing} style={{ borderRadius: '10px' }}
                  value={form?.professionalInfo?.serviceArea?.city || ''}
                  onChange={e => updateField('professionalInfo.serviceArea.city', e.target.value)}>
                  <option value="">Sélectionner</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Rayon ({form?.professionalInfo?.serviceArea?.radius || 0} km)</label>
                <input type="range" min="5" max="100" step="5" disabled={!editing}
                  value={form?.professionalInfo?.serviceArea?.radius || 20}
                  onChange={e => updateField('professionalInfo.serviceArea.radius', Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)', marginTop: 8 }} />
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="profile-section animate-fadeInUp" style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="profile-section-title" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><Clock size={18} style={{ color: 'var(--color-primary)' }} /> Disponibilités</div>
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
                <label className="form-label" style={{ fontWeight: 700 }}>De</label>
                <input className="form-input" type="time" disabled={!editing} style={{ borderRadius: '10px' }}
                  value={form?.professionalInfo?.availability?.hours?.start || '08:00'}
                  onChange={e => updateField('professionalInfo.availability.hours.start', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>À</label>
                <input className="form-input" type="time" disabled={!editing} style={{ borderRadius: '10px' }}
                  value={form?.professionalInfo?.availability?.hours?.end || '18:00'}
                  onChange={e => updateField('professionalInfo.availability.hours.end', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Ratings Section */}
          <div className="profile-section animate-fadeInUp" style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="profile-section-title" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><Star size={18} style={{ color: 'var(--color-primary)' }} /> Avis et notes ({stats.count})</div>
            {ratings.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-6)', border: 'none', background: 'var(--bg-input)' }}>
                Aucun avis pour le moment
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {ratings.map(r => (
                  <div key={r.id} className="card" style={{ padding: 'var(--space-4)', background: 'var(--bg-input)', border: 'none', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                      <RatingDisplay average={r.score} count={0} size={14} />
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{formatRelative(r.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)', margin: 0 }}>
                      {r.comment || "Aucun commentaire laissé."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REVENUS (EARNINGS) TAB CONTENT ── */}
      {activeTab === 'revenus' && (
        <div className="animate-fadeIn">
          
          {/* Main Balance Encart */}
          <div className="glass-card" style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 10px 24px rgba(16, 185, 129, 0.2)',
            marginBottom: 'var(--space-6)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', right: '-10%', bottom: '-20%', width: '150px', height: '150px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', pointerEvents: 'none' }} />
            
            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, display: 'block', marginBottom: '8px' }}>
              Solde disponible ce mois
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800 }}>{totalEarnings} €</span>
              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '99px', fontWeight: 700 }}>+12% vs avril</span>
            </div>

            {/* Monthly goal progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '6px', opacity: 0.9 }}>
                <span>Objectif mensuel : 3000 €</span>
                <span>{Math.round((totalEarnings / 3000) * 100)}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((totalEarnings / 3000) * 100, 100)}%`, height: '100%', background: 'white', borderRadius: '99px' }} />
              </div>
            </div>
          </div>

          {/* Quick billing stats indicators */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: 'var(--space-6)' }}>
            <div className="glass-card" style={{ padding: '16px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', background: 'white' }}>
              <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Tarif horaire moyen</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>45 € / h</span>
            </div>
            <div className="glass-card" style={{ padding: '16px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', background: 'white' }}>
              <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Factures payées</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{completedMissions.length} / {completedMissions.length}</span>
            </div>
          </div>

          {/* Graphical SVG trend chart */}
          <div className="glass-card animate-fadeInUp" style={{ padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', background: 'white', marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Tendances de facturation</h3>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)' }}>Semaines</span>
            </div>
            {/* SVG custom bar graph */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '120px', padding: '10px 0' }}>
              {[
                { label: 'S1', val: 320, active: false },
                { label: 'S2', val: 510, active: false },
                { label: 'S3', val: 420, active: false },
                { label: 'S4', val: 680, active: true },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: item.active ? 'var(--color-success)' : 'var(--text-tertiary)', marginBottom: '6px' }}>{item.val}€</div>
                  <div style={{
                    width: '32px',
                    height: `${(item.val / 700) * 80}px`,
                    background: item.active ? 'linear-gradient(180deg, #10B981 0%, #34D399 100%)' : 'var(--color-primary-lighter)',
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.4s ease'
                  }} />
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Payments History List */}
          <div className="glass-card animate-fadeInUp" style={{ padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', background: 'white' }}>
            <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Historique des interventions
            </h3>
            
            {completedMissions.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px 0' }}>
                <CheckSquare size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ fontSize: 'var(--font-xs)', fontWeight: 600 }}>Aucune intervention payée pour le moment</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {completedMissions.map((mission) => (
                  <div key={mission.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                      <span style={{ fontSize: 'var(--font-xs)', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                        {CARE_TYPES.find(c => c.id === mission.careType)?.label || mission.careType}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                        {formatDate(mission.scheduledDate)} · {mission.patientName}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: 'var(--color-success)', display: 'block' }}>
                        +{mission.estimatedCost} €
                      </span>
                      <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-success)', padding: '2px 6px', borderRadius: '99px', fontWeight: 700 }}>
                        Payé
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Utility Options Card */}
          <div className="glass-card animate-fadeInUp" style={{ padding: '20px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', background: 'white', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Download size={18} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>Télécharger le récapitulatif annuel</span>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', justifyContent: 'space-between', cursor: 'pointer', borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CreditCard size={18} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>Modifier mes coordonnées bancaires (RIB)</span>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
            </div>
          </div>

        </div>
      )}

      {/* Developer Options and Logout Footer */}
      <div style={{ marginTop: 'var(--space-12)', padding: 'var(--space-4)', borderTop: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', textAlign: 'center' }}>
          Outils Développeur
        </p>
        <button 
          className="btn btn-sm btn-secondary btn-block" 
          style={{ background: 'white', color: 'var(--text-secondary)' }}
          onClick={() => {
            if (window.confirm("Réinitialiser toutes les données vers le scénario de démonstration ?")) {
              import('../../utils/demoData').then(m => {
                m.resetDemoData();
                window.location.reload();
              });
            }
          }}
        >
          Réinitialiser le scénario de démo
        </button>
      </div>

      <button className="btn btn-ghost btn-block" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-4)' }}
        onClick={logout}>
        <LogOut size={18} /> Se déconnecter
      </button>
    </div>
  );
}
