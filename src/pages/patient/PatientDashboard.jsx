// ── Patient Dashboard ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import missionService from '../../services/missionService';
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

  useEffect(() => {
    async function loadMissions() {
      if (user) {
        const data = await missionService.getByPatient(user.id);
        setMissions(data);
      }
    }
    loadMissions();
  }, [user]);

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

      {/* Stats */}
      <div className="dashboard-stats animate-fadeInUp">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
            <Clock size={22} />
          </div>
          <div className="stat-card-value">{openMissions.length}</div>
          <div className="stat-card-label">En attente</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-card-value">{assignedMissions.length}</div>
          <div className="stat-card-label">Assignées</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <CheckCircle size={22} />
          </div>
          <div className="stat-card-value">{completedMissions.length}</div>
          <div className="stat-card-label">Terminées</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#E0E7FF', color: '#6366F1' }}>
            <Users size={22} />
          </div>
          <div className="stat-card-value">{totalApplicants}</div>
          <div className="stat-card-label">Candidatures</div>
        </div>
      </div>

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
