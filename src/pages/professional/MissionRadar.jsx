// ── Mission Radar (Professional) ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import authService from '../../services/authService';
import { CARE_TYPES, CITIES } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import { filterMissionsByProximity, getDistanceLabel } from '../../utils/geoUtils';
import {
  Radar, MapPin, Calendar, Clock, Search, Filter,
  ChevronRight, Send, User, ClipboardList
} from 'lucide-react';

export default function MissionRadar() {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [cityFilter, setCityFilter] = useState(user?.professionalInfo?.serviceArea?.city || '');
  const [radiusFilter, setRadiusFilter] = useState(user?.professionalInfo?.serviceArea?.radius || 30);
  const [careFilter, setCareFilter] = useState('');
  const [applyingId, setApplyingId] = useState(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    async function load() {
      const open = await missionService.getOpenMissions();
      setMissions(open);
    }
    load();
  }, []);

  useEffect(() => {
    let result = [...missions];
    if (cityFilter) {
      result = filterMissionsByProximity(result, cityFilter, radiusFilter);
    }
    if (careFilter) {
      result = result.filter(m => m.careType === careFilter);
    }
    setFiltered(result);
  }, [missions, cityFilter, radiusFilter, careFilter]);

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;
  const hasApplied = (mission) => mission.applicants?.some(a => a.proId === user?.id);

  const handleApply = (missionId) => {
    setApplyingId(missionId);
    setApplyMessage('');
    setShowApplyModal(true);
  };

  const submitApply = async () => {
    try {
      await missionService.applyToMission(applyingId, user.id, applyMessage);
      const updated = await missionService.getOpenMissions();
      setMissions(updated);
      showToast('Candidature envoyée !', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    setShowApplyModal(false);
  };

  // Patient name no longer needed in this view (was unused in JSX)

  return (
    <div className="page-container">
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Radar size={28} style={{ color: 'var(--color-primary)' }} />
        Radar Missions
      </div>
      <p className="page-subtitle">{filtered.length} mission(s) disponible(s)</p>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Filtres</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 'var(--font-xs)' }}>Ville</label>
            <select className="form-input form-select" value={cityFilter}
              onChange={e => setCityFilter(e.target.value)} style={{ fontSize: 'var(--font-sm)' }}>
              <option value="">Toutes</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 'var(--font-xs)' }}>Type de soin</label>
            <select className="form-input form-select" value={careFilter}
              onChange={e => setCareFilter(e.target.value)} style={{ fontSize: 'var(--font-sm)' }}>
              <option value="">Tous</option>
              {CARE_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        {cityFilter && (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <label className="form-label" style={{ fontSize: 'var(--font-xs)' }}>Rayon : {radiusFilter} km</label>
            <input type="range" min="5" max="100" step="5" value={radiusFilter}
              onChange={e => setRadiusFilter(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
          </div>
        )}
      </div>

      {/* Missions List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Search size={28} /></div>
          <div className="empty-state-title">Aucune mission trouvée</div>
          <div className="empty-state-text">Essayez d'élargir votre zone de recherche ou vos filtres.</div>
        </div>
      ) : (
        <div className="mission-list">
          {filtered.map(mission => (
            <div key={mission.id} className="mission-card animate-fadeInUp">
              <div className="mission-card-header">
                <div className="mission-card-type">
                  <div className="mission-card-type-icon"><ClipboardList size={18} /></div>
                  {getCareLabel(mission.careType)}
                </div>
                {cityFilter && mission.address?.city && (
                  <span className="tag">{getDistanceLabel(cityFilter, mission.address.city) || mission.address.city}</span>
                )}
              </div>

              <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
                {mission.description?.slice(0, 120)}{mission.description?.length > 120 ? '...' : ''}
              </p>

              <div className="mission-card-meta">
                <div className="mission-card-meta-row">
                  <Calendar size={16} /> {formatDate(mission.scheduledDate)} à {mission.scheduledTime}
                </div>
                <div className="mission-card-meta-row">
                  <MapPin size={16} /> {mission.address?.street}, {mission.address?.city}
                </div>
                <div className="mission-card-meta-row">
                  <Clock size={16} /> {mission.estimatedDuration} min
                </div>
                <div className="mission-card-meta-row">
                  <User size={16} /> {mission.patientInfo?.name}
                  {mission.patientInfo?.age ? `, ${mission.patientInfo.age} ans` : ''}
                </div>
              </div>

              <div className="mission-card-footer">
                {mission.estimatedCost ? (
                  <div className="mission-card-price">{mission.estimatedCost} €</div>
                ) : <span />}
                {hasApplied(mission) ? (
                  <span className="badge badge-assigned"><span className="badge-dot" /> Postulé</span>
                ) : (
                  <button className="btn btn-primary btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleApply(mission.id); }}>
                    <Send size={14} /> Postuler
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="modal-title">Postuler à cette mission</h3>
            </div>
            <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="form-label">Message (optionnel)</label>
              <textarea className="form-input form-textarea"
                placeholder="Présentez-vous et expliquez pourquoi vous êtes qualifié..."
                value={applyMessage} onChange={e => setApplyMessage(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => setShowApplyModal(false)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={submitApply}>
                <Send size={16} /> Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
