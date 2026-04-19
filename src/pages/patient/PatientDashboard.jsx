// ── Patient Dashboard ── (Mockup-faithful design)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import missionService from '../../services/missionService';
import authService from '../../services/authService';
import ratingService from '../../services/ratingService';
import { RatingDisplay } from '../../components/SharedComponents';
import { CARE_TYPES, MISSION_STATUS_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import supabase from '../../lib/supabase';
import {
  Plus, Calendar, CheckCircle, Clock, Users,
  MapPin, ChevronRight, ClipboardList, Star, Search,
  Phone, AlertTriangle, ShieldAlert
} from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [featuredPros, setFeaturedPros] = useState([]);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isBroadcastingStart, setIsBroadcastingStart] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (user) {
        setMissions(await missionService.getByPatient(user.id));
      }
      const users = await authService.getAllUsers();
      const pros = users.filter(u => u.role === 'professional' && u.professionalInfo?.verified);
      const proRatings = await ratingService.getAllProRatings();
      const proData = pros.map(p => {
        const ratings = proRatings[p.id] || [];
        const avg = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : 0;
        return { ...p, ratingAvg: Math.round(avg * 10) / 10, ratingCount: ratings.length };
      }).sort((a,b) => b.ratingAvg - a.ratingAvg).slice(0, 5);
      setFeaturedPros(proData);
    }
    loadData();
  }, [user]);

  // Category cards with colored gradient backgrounds (matching mockup style)
  const CARE_CARDS = [
    { id: 'injection', label: 'Injection', sub: 'Soins infirmiers', emoji: '💉', gradient: 'linear-gradient(135deg, #DBEAFE 0%, #93C5FD 100%)', color: '#2563EB' },
    { id: 'bandage', label: 'Pansement', sub: 'Soins de plaies', emoji: '🩹', gradient: 'linear-gradient(135deg, #D1FAE5 0%, #6EE7B7 100%)', color: '#059669' },
    { id: 'hygiene', label: 'Toilette', sub: 'Aide à domicile', emoji: '🧽', gradient: 'linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)', color: '#D97706' },
    { id: 'monitoring', label: 'Surveillance', sub: 'Suivi médical', emoji: '📊', gradient: 'linear-gradient(135deg, #EDE9FE 0%, #C4B5FD 100%)', color: '#7C3AED' },
  ];

  const openMissions = missions.filter(m => m.status === 'open');
  const assignedMissions = missions.filter(m => m.status === 'assigned' || m.status === 'in_progress');
  const completedMissions = missions.filter(m => m.status === 'completed');

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  const handleSOSBroadcast = async () => {
    setIsBroadcastingStart(true);
    // Broadcast emergency on a public channel
    const channel = supabase.channel('emergency-alerts');
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'sos',
          payload: {
            patientId: user.id,
            patientName: `${user.firstName} ${user.lastName}`,
            city: user.address?.city || 'Inconnue',
            time: new Date().toISOString()
          }
        });
        setTimeout(() => {
          setIsBroadcastingStart(false);
          setShowEmergencyModal(false);
          showToast('Alerte SOS envoyée. Les professionnels autour de vous sont notifiés !', 'success');
        }, 1500);
      }
    });
  };

  return (
    <div className="page-container">
      {/* Greeting (below dark header) */}
      <div className="dashboard-greeting" style={{ marginBottom: 'var(--space-5)', paddingTop: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
            Bonjour, {user?.firstName} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Comment pouvons-nous vous aider aujourd'hui ?</p>
        </div>
        <button className="btn btn-icon" style={{ background: '#EF4444', color: 'white', borderRadius: '50%', width: 50, height: 50, boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }} onClick={() => setShowEmergencyModal(true)}>
          <ShieldAlert size={24} />
        </button>
      </div>

      {/* Search Bar (mockup style) */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', background: '#FFFFFF', padding: '14px 20px',
          borderRadius: 'var(--radius-lg)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid var(--border-color)', gap: '12px'
        }}>
          <Search size={20} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-base)' }}>
            Rechercher un soin, un professionnel...
          </span>
        </div>
      </div>

      {/* Categories of Care — pastel colored cards with emoji icons like mockup */}
      <div className="section">
        <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
          Catégories de soins
        </h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)',
          overflowX: 'auto', scrollbarWidth: 'none'
        }}>
          {CARE_CARDS.map(card => (
            <div
              key={card.id}
              onClick={() => navigate('/patient/create-mission')}
              style={{
                background: card.gradient,
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-4)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                minHeight: '130px',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
            >
              <div style={{ fontSize: '40px', lineHeight: 1 }}>{card.emoji}</div>
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-base)', color: card.color }}>{card.label}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'rgba(0,0,0,0.5)', fontWeight: 500 }}>{card.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Professionals — card carousel like mockup */}
      {featuredPros.length > 0 && (
        <div className="section">
          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
            Professionnels recommandés
          </h2>
          <div style={{
            display: 'flex', overflowX: 'auto', gap: 'var(--space-3)',
            paddingBottom: 'var(--space-2)',
            margin: '0 calc(var(--content-padding) * -1)',
            paddingLeft: 'var(--content-padding)',
            paddingRight: 'var(--content-padding)',
            scrollbarWidth: 'none',
          }}>
            {featuredPros.map((pro, i) => {
              const gradients = [
                'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
                'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
                'linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%)',
              ];
              return (
                <div key={pro.id} onClick={() => navigate('/patient/create-mission')}
                  style={{
                    minWidth: '170px', maxWidth: '170px',
                    background: gradients[i % gradients.length],
                    padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    textAlign: 'center', cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div className="avatar avatar-lg" style={{
                    marginBottom: 'var(--space-2)',
                    border: '3px solid white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}>
                    {pro.firstName?.[0]}{pro.lastName?.[0]}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                    {pro.firstName} {pro.lastName?.[0]}.
                  </div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                    {pro.professionalInfo?.specialties?.[0] || 'Généraliste'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-3)' }}>
                    <Star size={14} fill="#F59E0B" color="#F59E0B" />
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                      {pro.ratingCount > 0 ? pro.ratingAvg : 'Nouveau'}
                    </span>
                    {pro.ratingCount > 0 && (
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                        ({pro.ratingCount})
                      </span>
                    )}
                  </div>
                  <button className="btn btn-sm btn-secondary" style={{
                    borderRadius: 'var(--radius-full)', fontSize: 'var(--font-xs)',
                    padding: '6px 16px', width: '100%',
                  }}>
                    Réserver
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Missions */}
      <div className="section">
        <div className="section-title">
          <span>Missions à venir</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patient/missions')}>
            Tout voir <ChevronRight size={16} />
          </button>
        </div>

        {[...openMissions, ...assignedMissions].length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ClipboardList size={28} /></div>
            <div className="empty-state-title">Aucune mission en cours</div>
            <div className="empty-state-text">Créez votre première demande de soins pour commencer.</div>
            <button className="btn btn-primary" onClick={() => navigate('/patient/create-mission')}>
              <Plus size={18} /> Créer une demande
            </button>
          </div>
        ) : (
          <div className="mission-list">
            {[...openMissions, ...assignedMissions].slice(0, 3).map(mission => (
              <div key={mission.id} className="mission-card"
                onClick={() => navigate(`/patient/mission/${mission.id}`)}>
                <div className="mission-card-header">
                  <div className="mission-card-type">
                    <div className="mission-card-type-icon">
                      <ClipboardList size={18} />
                    </div>
                    {getCareLabel(mission.careType)}
                  </div>
                  <span className={`badge badge-${mission.status}`}>
                    <span className="badge-dot" />
                    {MISSION_STATUS_LABELS[mission.status]}
                  </span>
                </div>
                <div className="mission-card-meta">
                  <div className="mission-card-meta-row">
                    <Calendar size={16} />
                    {formatDate(mission.scheduledDate)} à {mission.scheduledTime}
                  </div>
                  <div className="mission-card-meta-row">
                    <MapPin size={16} />
                    {mission.address?.street}, {mission.address?.city}
                  </div>
                </div>
                <div className="mission-card-footer">
                  <div className="mission-card-applicants">
                    <Users size={14} />
                    {mission.applicants?.length || 0} candidature(s)
                  </div>
                  {mission.estimatedCost && (
                    <div className="mission-card-price">{mission.estimatedCost} €</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Missions */}
      {completedMissions.length > 0 && (
        <div className="section">
          <div className="section-title">
            <span>Missions terminées</span>
          </div>
          <div className="mission-list">
            {completedMissions.slice(0, 3).map(mission => (
              <div key={mission.id} className="mission-card"
                onClick={() => navigate(`/patient/mission/${mission.id}`)}>
                <div className="mission-card-header">
                  <div className="mission-card-type">
                    <div className="mission-card-type-icon" style={{
                      background: 'var(--color-success-light)',
                      color: 'var(--color-success)'
                    }}>
                      <CheckCircle size={18} />
                    </div>
                    {getCareLabel(mission.careType)}
                  </div>
                  <span className="badge badge-completed">
                    <span className="badge-dot" /> Terminée
                  </span>
                </div>
                <div className="mission-card-meta">
                  <div className="mission-card-meta-row">
                    <Calendar size={16} />
                    {formatDate(mission.scheduledDate)}
                  </div>
                </div>
                {mission.careNotes?.length > 0 && (
                  <div className="mission-card-footer">
                    <div className="mission-card-applicants" style={{ color: 'var(--color-primary)' }}>
                      📝 {mission.careNotes.length} note(s) de soins
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => navigate('/patient/create-mission')}>
        <Plus size={24} />
      </button>
      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div className="modal-overlay" onClick={() => setShowEmergencyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div className="modal-handle" />
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: '#FCA5A5', color: '#EF4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)',
              animation: 'pulseGlow 2s infinite'
            }}>
              <ShieldAlert size={40} />
            </div>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: '#DC2626', marginBottom: 'var(--space-2)' }}>
              Alerte d'Urgence (Astreinte)
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
              Vous êtes sur le point de déclencher une alerte générale. Tous les professionnels de santé vérifiés et disponibles dans votre zone (<strong>{user?.address?.city || 'votre ville'}</strong>) recevront une notification immédiate.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <button className="btn btn-primary" style={{ background: '#EF4444', border: 'none', height: 50 }}
                onClick={handleSOSBroadcast} disabled={isBroadcastingStart}>
                {isBroadcastingStart ? 'Envoi en cours...' : 'Déclencher MSG SOS'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowEmergencyModal(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
