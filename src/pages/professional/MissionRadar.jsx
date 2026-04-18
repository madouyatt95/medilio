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
      backgroundColor: '#0F172A',
      backgroundImage: `
        radial-gradient(circle at center, rgba(37, 99, 235, 0.2) 0%, #0F172A 80%),
        url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e293b' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
      `,
      backgroundAttachment: 'fixed',
      display: 'flex',
      flexDirection: 'column'
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
          <div style={{ display: 'flex', overflowX: 'auto', gap: 'var(--space-4)', paddingBottom: 'calc(var(--bottom-nav-height) + 24px)', margin: '0 calc(var(--content-padding) * -1)', paddingLeft: 'var(--content-padding)', paddingRight: 'var(--content-padding)', scrollbarWidth: 'none' }}>
            {filtered.map(mission => (
              <div key={mission.id} style={{ 
                minWidth: '300px', maxWidth: '300px', display: 'flex', flexDirection: 'column',
                background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(20px)', borderRadius: 'var(--radius-xl)',
                border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
              }}>
                <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 800 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#67E8F9', boxShadow: '0 0 10px #67E8F9' }} />
                      {getCareLabel(mission.careType)}
                    </div>
                    {cityFilter && mission.address?.city && (
                      <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '8px' }}>
                        {getDistanceLabel(cityFilter, mission.address.city) || mission.address.city}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: 'var(--space-4)', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'rgba(255,255,255,0.9)', fontSize: 'var(--font-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} color="#64748b" /> {formatDate(mission.scheduledDate)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={14} color="#64748b" /> {mission.address?.city}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={14} color="#64748b" /> {mission.estimatedDuration} minutes</div>
                  </div>
                </div>

                <div style={{ padding: 'var(--space-4)', background: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#67E8F9', fontWeight: 800, fontSize: 'var(--font-lg)' }}>{mission.estimatedCost ? `${mission.estimatedCost} €` : '-'}</div>
                  {hasApplied(mission) ? (
                    <span style={{ color: '#10B981', fontWeight: 700, fontSize: '14px' }}>Postulé ✓</span>
                  ) : (
                    <button className="btn btn-primary btn-glow btn-sm" style={{ borderRadius: '99px' }} onClick={(e) => { e.stopPropagation(); handleApply(mission.id); }}>
                      <Send size={14} /> J'y vais
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
