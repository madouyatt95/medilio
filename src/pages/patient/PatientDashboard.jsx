// ── Patient Dashboard ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import missionService from '../../services/missionService';
import authService from '../../services/authService';
import ratingService from '../../services/ratingService';
import { RatingDisplay } from '../../components/SharedComponents';
import { CARE_TYPES, MISSION_STATUS_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import {
  Plus, Calendar, CheckCircle, Clock, Users,
  MapPin, ChevronRight, ClipboardList
} from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [featuredPros, setFeaturedPros] = useState([]);

  useEffect(() => {
    async function loadData() {
      if (user) {
        setMissions(await missionService.getByPatient(user.id));
      }
      
      // Load verified pros for the carousel
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

  const CARE_STYLES = {
    injection: { 
      bg: 'url(https://images.unsplash.com/photo-1542884748-2b87b36c6b90?w=600&q=80) center/cover', 
      overlay: 'linear-gradient(180deg, rgba(37,99,235,0.2) 0%, rgba(37,99,235,0.8) 100%)'
    },
    bandage: { 
      bg: 'url(https://images.unsplash.com/photo-1603398938378-fb54f510a60f?w=600&q=80) center/cover', 
      overlay: 'linear-gradient(180deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.8) 100%)'
    },
    hygiene: { 
      bg: 'url(https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80) center/cover', 
      overlay: 'linear-gradient(180deg, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.8) 100%)'
    },
    monitoring: { 
      bg: 'url(https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=600&q=80) center/cover', 
      overlay: 'linear-gradient(180deg, rgba(6,182,212,0.2) 0%, rgba(6,182,212,0.8) 100%)'
    },
    medication: { 
      bg: 'url(https://images.unsplash.com/photo-1550572017-ed200f545dec?w=600&q=80) center/cover', 
      overlay: 'linear-gradient(180deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.8) 100%)'
    }
  };

  const openMissions = missions.filter(m => m.status === 'open');
  const assignedMissions = missions.filter(m => m.status === 'assigned' || m.status === 'in_progress');
  const completedMissions = missions.filter(m => m.status === 'completed');
  const totalApplicants = missions.reduce((sum, m) => sum + (m.applicants?.length || 0), 0);

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  return (
    <div className="page-container">
      {/* Greeting & Search */}
      <div className="dashboard-greeting" style={{ marginBottom: 'var(--space-5)' }}>
        <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>Bonjour, {user?.firstName} 👋</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Comment pouvons-nous vous aider aujourd'hui ?</p>
      </div>

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', background: '#FFFFFF', padding: '16px 20px', 
          borderRadius: '99px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--border-light)'
        }}>
          <span style={{ fontSize: '20px', marginRight: '12px' }}>🔍</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-base)', fontWeight: 500 }}>Rechercher un soin, une infirmière...</span>
        </div>
      </div>

      {/* Categories of Care */}
      <div className="section" style={{ padding: '0 var(--content-padding)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800 }}>Soins disponibles</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--space-3)' }}>
          {CARE_TYPES.slice(0,4).map((care) => {
            const style = CARE_STYLES[care.id] || CARE_STYLES.nursing;
            return (
              <div key={care.id} onClick={() => navigate('/patient/create-mission')}
                   style={{ 
                     background: style.bg, height: '140px', borderRadius: 'var(--radius-xl)', 
                     position: 'relative', overflow: 'hidden', cursor: 'pointer',
                     boxShadow: '0 10px 20px -5px rgba(0,0,0,0.15)'
                   }}>
                <div style={{ position: 'absolute', inset: 0, background: style.overlay }} />
                <div style={{ position: 'absolute', bottom: 'var(--space-3)', left: 'var(--space-3)', right: 'var(--space-3)' }}>
                  <div style={{ fontWeight: 800, fontSize: 'var(--font-base)', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    {care.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Featured Professionals */}
      {featuredPros.length > 0 && (
        <div className="section">
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>Disponibles près de vous</h2>
          <div style={{ display: 'flex', overflowX: 'auto', gap: 'var(--space-3)', paddingBottom: 'var(--space-2)', margin: '0 calc(var(--content-padding) * -1)', paddingLeft: 'var(--content-padding)', paddingRight: 'var(--content-padding)', scrollbarWidth: 'none' }}>
            {featuredPros.map(pro => (
              <div key={pro.id} onClick={() => navigate('/patient/create-mission')}
                   style={{ minWidth: '140px', background: '#FFFFFF', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', 
                            boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)', border: '1px solid var(--border-light)', 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer' }}>
                <div className="avatar avatar-lg" style={{ marginBottom: 'var(--space-2)', background: 'var(--color-primary-lighter)', color: 'var(--color-primary)' }}>
                  {pro.firstName?.[0]}{pro.lastName?.[0]}
                </div>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>{pro.firstName}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
                  {pro.professionalInfo?.specialties?.[0] || 'Généraliste'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#F59E0B', fontSize: 'var(--font-xs)', fontWeight: 700 }}>
                  ★ {pro.ratingCount > 0 ? pro.ratingAvg : 'Nouveau'}
                </div>
              </div>
            ))}
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
    </div>
  );
}
