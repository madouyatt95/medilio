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
    <div className="dark-mode" style={{ 
      minHeight: '100vh', 
      backgroundImage: 'url(https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)', 
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      backgroundAttachment: 'fixed',
      paddingBottom: 'var(--space-12)'
    }}>
      <div className="page-container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Header styling specifically for radar */}
        <div style={{ padding: 'var(--space-4) 0', marginBottom: 'var(--space-4)' }}>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            <Radar size={28} style={{ color: 'var(--color-primary-light)' }} className="pulse-glow" />
            Radar Missions
          </div>
          <p className="page-subtitle" style={{ color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{filtered.length} mission(s) disponible(s) à proximité</p>
        </div>

        {/* Filters */}
        <div className="glass-panel" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', color: 'white' }}>
            <Filter size={16} />
            <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Filtres de recherche</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <select className="form-input form-select" value={cityFilter}
                onChange={e => setCityFilter(e.target.value)} style={{ fontSize: 'var(--font-sm)', background: 'rgba(255,255,255,0.9)', color: '#000' }}>
                <option value="">Toutes les villes</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <select className="form-input form-select" value={careFilter}
                onChange={e => setCareFilter(e.target.value)} style={{ fontSize: 'var(--font-sm)', background: 'rgba(255,255,255,0.9)', color: '#000' }}>
                <option value="">Tous les types</option>
                {CARE_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          {cityFilter && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label" style={{ fontSize: 'var(--font-xs)', color: 'white' }}>Rayon : {radiusFilter} km</label>
              <input type="range" min="5" max="100" step="5" value={radiusFilter}
                onChange={e => setRadiusFilter(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary-light)' }} />
            </div>
          )}
        </div>

        {/* Missions List */}
        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
            <div className="empty-state-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}><Search size={28} /></div>
            <div className="empty-state-title" style={{ color: 'white' }}>Aucune mission trouvée</div>
            <div className="empty-state-text" style={{ color: 'rgba(255,255,255,0.7)' }}>Essayez d'élargir votre zone de recherche ou vos filtres.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', overflowX: 'auto', gap: 'var(--space-4)', paddingBottom: 'var(--space-4)', margin: '0 calc(var(--content-padding) * -1)', paddingLeft: 'var(--content-padding)', paddingRight: 'var(--content-padding)' }}>
            {filtered.map(mission => (
              <div key={mission.id} className="glass-panel animate-fadeInUp" style={{ minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 700 }}>
                      <div className="mission-card-type-icon" style={{ background: 'var(--color-primary-light)', color: 'white' }}><ClipboardList size={18} /></div>
                      {getCareLabel(mission.careType)}
                    </div>
                    {cityFilter && mission.address?.city && (
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.2)' }}>{getDistanceLabel(cityFilter, mission.address.city) || mission.address.city}</span>
                    )}
                  </div>
                </div>

                <div style={{ padding: 'var(--space-4)', flex: 1 }}>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'rgba(255,255,255,0.8)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
                    {mission.description?.slice(0, 120)}{mission.description?.length > 120 ? '...' : ''}
                  </p>

                  <div className="mission-card-meta" style={{ color: 'rgba(255,255,255,0.9)' }}>
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
                </div>

                <div style={{ padding: 'var(--space-4)', background: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {mission.estimatedCost ? (
                    <div className="mission-card-price" style={{ color: '#67E8F9' }}>{mission.estimatedCost} €</div>
                  ) : <span />}
                  {hasApplied(mission) ? (
                    <span className="badge" style={{ background: 'var(--color-success)', color: 'white' }}>Postulé</span>
                  ) : (
                    <button className="btn btn-primary btn-glow btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleApply(mission.id); }}>
                      <Send size={14} /> Postuler
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
