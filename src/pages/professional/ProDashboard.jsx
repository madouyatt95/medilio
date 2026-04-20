// ── Professional Dashboard ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import missionService from '../../services/missionService';
import { CARE_TYPES, MISSION_STATUS_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import {
  Radar, Calendar, CheckCircle, Clock, DollarSign,
  MapPin, ChevronRight, ClipboardList, TrendingUp
} from 'lucide-react';

export default function ProDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myMissions, setMyMissions] = useState([]);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      if (user) {
        const my = await missionService.getByProfessional(user.id);
        setMyMissions(my);
        const open = await missionService.getOpenMissions();
        setOpenCount(open.length);
      }
    }
    loadData();
  }, [user]);

  const assignedMissions = myMissions.filter(m => m.status === 'assigned' || m.status === 'in_progress');
  const completedMissions = myMissions.filter(m => m.status === 'completed');
  const totalEarnings = completedMissions.reduce((sum, m) => sum + (Number(m.estimatedCost) || 0), 0);

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  return (
    <div className="page-container" style={{ paddingTop: 'var(--space-8)' }}>
      <div className="dashboard-greeting animate-fadeIn" style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <div className="avatar-lg" style={{ border: '2px solid white', boxShadow: 'var(--shadow-lg)', background: 'var(--color-primary)', color: 'white' }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Bonjour, {user?.firstName} 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: 'var(--font-sm)' }}>
              Prêt pour votre tournée ?
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-stats animate-fadeInUp" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="glass-card stat-card" onClick={() => navigate('/pro/radar')} style={{ cursor: 'pointer', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-info)' }}>
            <Radar size={22} />
          </div>
          <div className="stat-card-value">{openCount}</div>
          <div className="stat-card-label">Radar</div>
        </div>
        <div className="glass-card stat-card" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-card-value">{assignedMissions.length}</div>
          <div className="stat-card-label">Missions</div>
        </div>
        <div className="glass-card stat-card" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>
            <CheckCircle size={22} />
          </div>
          <div className="stat-card-value">{completedMissions.length}</div>
          <div className="stat-card-label">Terminées</div>
        </div>
        <div className="glass-card stat-card" onClick={() => navigate('/pro/tour')} style={{ cursor: 'pointer', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366F1' }}>
            <MapPin size={22} />
          </div>
          <div className="stat-card-value">{assignedMissions.length}</div>
          <div className="stat-card-label">Tournée</div>
        </div>
      </div>

      {/* Quick search/radar action */}
      <div className="glass-panel pulse-glow" onClick={() => navigate('/pro/radar')}
        style={{ 
          marginBottom: 'var(--space-10)', 
          background: 'var(--color-primary-gradient)', 
          color: 'white', 
          cursor: 'pointer',
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          border: 'none'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'var(--font-xl)', marginBottom: 4 }}>
              🔍 Radar de missions
            </div>
            <div style={{ fontSize: 'var(--font-sm)', opacity: 0.9, fontWeight: 500 }}>
              {openCount} missions à pourvoir dans votre zone
            </div>
          </div>
          <div className="glass-pill" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '10px' }}>
            <ChevronRight size={24} color="white" />
          </div>
        </div>
      </div>

      {/* Assigned missions */}
      {assignedMissions.length > 0 && (
        <div className="section animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="section-title">
            <span>Mes interventions</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/pro/tour')}>Voir tournée</button>
          </div>
          <div className="mission-list">
            {assignedMissions.map(mission => (
              <div key={mission.id} className="glass-card mission-card"
                style={{ borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', border: '1.5px solid rgba(255,255,255,0.4)', marginBottom: 'var(--space-4)' }}
                onClick={() => navigate(`/pro/mission/${mission.id}`)}>
                <div className="mission-card-header" style={{ marginBottom: 'var(--space-3)' }}>
                  <div className="mission-card-type">
                    <div className="mission-card-type-icon" style={{ background: 'var(--color-primary-lighter)', color: 'var(--color-primary)' }}>
                      <ClipboardList size={18} />
                    </div>
                    <strong>{getCareLabel(mission.careType)}</strong>
                  </div>
                  <span className={`badge badge-${mission.status}`}>
                    {MISSION_STATUS_LABELS[mission.status]}
                  </span>
                </div>
                <div className="mission-card-meta" style={{ gap: 'var(--space-2)' }}>
                  <div className="mission-card-meta-row" style={{ fontWeight: 600 }}>
                    <Calendar size={16} /> {formatDate(mission.scheduledDate)} à {mission.scheduledTime}
                  </div>
                  <div className="mission-card-meta-row" style={{ color: 'var(--text-secondary)' }}>
                    <MapPin size={16} /> {mission.address?.city}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent completed */}
      {completedMissions.length > 0 && (
        <div className="section">
          <div className="section-title">Récemment terminées</div>
          <div className="mission-list">
            {completedMissions.slice(0, 3).map(mission => (
              <div key={mission.id} className="mission-card"
                onClick={() => navigate(`/pro/mission/${mission.id}`)}>
                <div className="mission-card-header">
                  <div className="mission-card-type">
                    <div className="mission-card-type-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                      <CheckCircle size={18} />
                    </div>
                    {getCareLabel(mission.careType)}
                  </div>
                  <span className="badge badge-completed"><span className="badge-dot" /> Terminée</span>
                </div>
                <div className="mission-card-meta">
                  <div className="mission-card-meta-row"><Calendar size={16} /> {formatDate(mission.scheduledDate)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
