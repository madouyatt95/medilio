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

  const CARE_IMAGES = {
    nursing: 'https://images.unsplash.com/photo-1584820927508-cadeaca4e4f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    physio: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    blood: 'https://images.unsplash.com/photo-1579684453423-f84349ef60b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    companion: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    hygiene: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
  };

  const openMissions = missions.filter(m => m.status === 'open');
  const assignedMissions = missions.filter(m => m.status === 'assigned' || m.status === 'in_progress');
  const completedMissions = missions.filter(m => m.status === 'completed');
  const totalApplicants = missions.reduce((sum, m) => sum + (m.applicants?.length || 0), 0);

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  return (
    <div className="page-container">
      {/* Greeting */}
      <div className="dashboard-greeting animate-fadeIn">
        <h1>Bonjour, {user?.firstName} 👋</h1>
        <p>Gérez vos demandes de soins à domicile</p>
      </div>

      {/* Categories of Care */}
      <div className="section animate-fadeInUp">
        <div className="section-title">
          <span>Nos catégories de soins</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          {CARE_TYPES.slice(0,4).map((care) => (
            <div key={care.id} className="category-card" 
                 style={{ backgroundImage: `url(${CARE_IMAGES[care.id] || CARE_IMAGES.nursing})` }}
                 onClick={() => navigate('/patient/create-mission')}
            >
              <div className="category-card-content">
                <div className="category-card-title">{care.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Professionals */}
      {featuredPros.length > 0 && (
        <div className="section animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="section-title">
            <span>Professionnels à la une</span>
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', gap: 'var(--space-4)', paddingBottom: 'var(--space-3)', margin: '0 calc(var(--content-padding) * -1)', paddingLeft: 'var(--content-padding)', paddingRight: 'var(--content-padding)'}}>
            {featuredPros.map(pro => (
              <div key={pro.id} className="glass-panel" style={{ minWidth: '220px', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }} onClick={() => navigate('/patient/create-mission')}>
                <div className="avatar avatar-xl" style={{ marginBottom: 'var(--space-3)' }}>{pro.firstName?.[0]}{pro.lastName?.[0]}</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-base)' }}>{pro.firstName} {pro.lastName}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                  {pro.professionalInfo?.specialties?.slice(0, 2).join(', ')}
                </div>
                {pro.ratingCount > 0 ? (
                  <RatingDisplay average={pro.ratingAvg} count={pro.ratingCount} size={14} />
                ) : (
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Nouveau</span>
                )}
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
