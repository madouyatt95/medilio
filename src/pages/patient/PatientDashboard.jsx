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
  Phone
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

  return (
    <div className="page-container" style={{ paddingTop: 'var(--space-8)' }}>
      {/* Greeting (Premium Header style) */}
      <div className="dashboard-greeting animate-fadeIn" style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <div className="avatar-lg" style={{ border: '2px solid white', boxShadow: 'var(--shadow-lg)' }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Bonjour, {user?.firstName} 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: 'var(--font-sm)' }}>
              Prêt pour votre prochain soin ?
            </p>
          </div>
        </div>
      </div>

      {/* Global Search Bar (Glass style) */}
      <div className="animate-fadeInUp" style={{ marginBottom: 'var(--space-10)', animationDelay: '100ms' }}>
        <div className="glass-panel" style={{
          display: 'flex', alignItems: 'center', padding: '16px 24px',
          borderRadius: 'var(--radius-xl)', gap: '16px', cursor: 'text'
        }}>
          <Search size={22} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <input 
            type="text" 
            placeholder="Rechercher un soin, un infirmier..." 
            style={{ 
              background: 'transparent', border: 'none', outline: 'none', 
              width: '100%', fontSize: 'var(--font-base)', fontWeight: 500,
              color: 'var(--text-primary)'
            }} 
          />
        </div>
      </div>

      {/* Categories of Care — pastel colored cards with emoji icons like mockup */}
      <div className="section animate-fadeInUp" style={{ animationDelay: '200ms' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800 }}>Nos expertises</h2>
          <button className="btn btn-ghost btn-sm" style={{ padding: 0 }}>Tout voir</button>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)'
        }}>
          {CARE_CARDS.map(card => (
            <div
              key={card.id}
              onClick={() => navigate('/patient/create-mission')}
              className="glass-card"
              style={{
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                minHeight: '140px',
                position: 'relative',
                overflow: 'hidden',
                background: `linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))`,
              }}
              onMouseOver={e => { 
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
              }}
              onMouseOut={e => { 
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.07)';
              }}
            >
              <div className="animate-float" style={{ 
                fontSize: '44px', lineHeight: 1, filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.1))`
              }}>
                {card.emoji}
              </div>
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-base)', color: card.color }}>{card.label}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>{card.sub}</div>
              </div>
              {/* Subtle background glow based on category color */}
              <div style={{
                position: 'absolute', bottom: '-20%', right: '-20%', width: '60%', height: '60%',
                background: card.color, opacity: 0.1, filter: 'blur(30px)', borderRadius: '50%',
                pointerEvents: 'none'
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* Featured Professionals — card carousel like mockup */}
      {featuredPros.length > 0 && (
        <div className="section animate-fadeInUp" style={{ animationDelay: '300ms' }}>
          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
            Les mieux notés
          </h2>
          <div style={{
            display: 'flex', overflowX: 'auto', gap: 'var(--space-4)',
            paddingBottom: 'var(--space-4)',
            margin: '0 calc(var(--content-padding) * -1)',
            paddingLeft: 'var(--content-padding)',
            paddingRight: 'var(--content-padding)',
            scrollbarWidth: 'none',
          }}>
            {featuredPros.map((pro, i) => (
              <div key={pro.id} onClick={() => navigate('/patient/create-mission')}
                className="glass-card"
                style={{
                  minWidth: '220px', maxWidth: '220px',
                  padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textAlign: 'center', cursor: 'pointer',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  transition: 'transform 0.3s ease'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div className="avatar-xl" style={{ 
                  marginBottom: 'var(--space-3)', border: '3px solid white', 
                  boxShadow: 'var(--shadow-md)' 
                }}>
                  {pro.firstName?.[0]}{pro.lastName?.[0]}
                </div>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-base)', marginBottom: 2 }}>
                  {pro.firstName} {pro.lastName}
                </div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                  {pro.professionalInfo?.specialties?.[0] || 'Infirmier'}
                </div>
                <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Star size={14} fill="currentColor" style={{ color: '#F59E0B' }} />
                  <span style={{ fontWeight: 800, fontSize: 'var(--font-sm)' }}>{pro.ratingAvg}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      {/* Upcoming Missions (Standard Card style) */}
      <div className="section animate-fadeInUp" style={{ animationDelay: '400ms' }}>
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
