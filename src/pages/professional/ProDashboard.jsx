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
    <div className="page-container">
      <div className="dashboard-greeting animate-fadeIn">
        <h1>Bonjour, {user?.firstName} 👋</h1>
        <p>Votre tableau de bord professionnel</p>
      </div>

      <div className="dashboard-stats animate-fadeInUp">
        <div className="stat-card" onClick={() => navigate('/pro/radar')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
            <Radar size={22} />
          </div>
          <div className="stat-card-value">{openCount}</div>
          <div className="stat-card-label">Disponibles</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-card-value">{assignedMissions.length}</div>
          <div className="stat-card-label">En cours</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <CheckCircle size={22} />
          </div>
          <div className="stat-card-value">{completedMissions.length}</div>
          <div className="stat-card-label">Terminées</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/pro/earnings')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon" style={{ background: '#E0E7FF', color: '#6366F1' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-card-value">{totalEarnings}€</div>
          <div className="stat-card-label">Revenus</div>
        </div>
      </div>

      {/* Quick action card */}
      <div className="card card-interactive" onClick={() => navigate('/pro/radar')}
        style={{ marginBottom: 'var(--space-6)', background: 'var(--color-primary-gradient)', color: 'white', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-lg)', marginBottom: 4 }}>
              🔍 Rechercher des missions
            </div>
            <div style={{ fontSize: 'var(--font-sm)', opacity: 0.9 }}>
              {openCount} mission(s) disponible(s) près de vous
            </div>
          </div>
          <ChevronRight size={24} />
        </div>
      </div>

      {/* Assigned missions */}
      {assignedMissions.length > 0 && (
        <div className="section">
          <div className="section-title">Mes missions en cours</div>
          <div className="mission-list">
            {assignedMissions.map(mission => (
              <div key={mission.id} className="mission-card"
                onClick={() => navigate(`/pro/mission/${mission.id}`)}>
                <div className="mission-card-header">
                  <div className="mission-card-type">
                    <div className="mission-card-type-icon"><ClipboardList size={18} /></div>
                    {getCareLabel(mission.careType)}
                  </div>
                  <span className={`badge badge-${mission.status}`}>
                    <span className="badge-dot" /> {MISSION_STATUS_LABELS[mission.status]}
                  </span>
                </div>
                <div className="mission-card-meta">
                  <div className="mission-card-meta-row">
                    <Calendar size={16} /> {formatDate(mission.scheduledDate)} à {mission.scheduledTime}
                  </div>
                  <div className="mission-card-meta-row">
                    <MapPin size={16} /> {mission.address?.city}
                  </div>
                </div>
                {mission.estimatedCost && (
                  <div className="mission-card-footer">
                    <span />
                    <div className="mission-card-price">{mission.estimatedCost} €</div>
                  </div>
                )}
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
