// ── Mission Radar (Professional) — with Interactive Map ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import geocodingService from '../../services/geocodingService';
import emailService from '../../services/emailService';
import authService from '../../services/authService';
import { CARE_TYPES, CITIES } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import { filterMissionsByProximity, getDistanceLabel, calculateDistance, CITY_COORDS } from '../../utils/geoUtils';
import InteractiveMap, { MARKER_COLORS } from '../../components/InteractiveMap';
import {
  Radar, MapPin, Calendar, Clock, Search, Filter,
  ChevronRight, Send, User, ClipboardList, Crosshair, Map as MapIcon, List
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
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [geocodedMissions, setGeocodedMissions] = useState({}); // missionId -> {lat, lng}
  const [highlightedMission, setHighlightedMission] = useState(null);

  // Detect user's city from browser GPS
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      showToast('La géolocalisation n\'est pas disponible sur votre appareil', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        // Reverse geocode to find city name
        const reverseResult = await geocodingService.reverseGeocode(latitude, longitude);
        if (reverseResult?.city) {
          setCityFilter(reverseResult.city);
          showToast(`📍 Position détectée : ${reverseResult.city}`, 'success');
        } else {
          // Fallback: find closest known city
          let best = null;
          let bestDist = Infinity;
          for (const [city, coords] of Object.entries(CITY_COORDS)) {
            const d = calculateDistance(latitude, longitude, coords.lat, coords.lng);
            if (d < bestDist) {
              bestDist = d;
              best = city;
            }
          }
          if (best) {
            setCityFilter(best);
            showToast(`📍 Position détectée : ${best} (${Math.round(bestDist)} km)`, 'success');
          }
        }
        setLocating(false);
      },
      (err) => {
        showToast('Impossible d\'obtenir votre position. Vérifiez les permissions.', 'error');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    async function load() {
      const open = await missionService.getOpenMissions();
      setMissions(open);
    }
    load();
  }, []);

  // Geocode missions that have addresses but no lat/lng
  useEffect(() => {
    async function geocodeMissions() {
      const toGeocode = missions.filter(m =>
        m.address?.street && m.address?.city && !m.address?.lat && !geocodedMissions[m.id]
      );
      if (toGeocode.length === 0) return;

      const newGeocoded = { ...geocodedMissions };
      for (const m of toGeocode) {
        const result = await geocodingService.geocodeAddress(
          m.address.street, m.address.city, m.address.postalCode
        );
        if (result) {
          newGeocoded[m.id] = { lat: result.lat, lng: result.lng };
        }
        // Small delay to respect API rate limits
        await new Promise(r => setTimeout(r, 100));
      }
      setGeocodedMissions(newGeocoded);
    }
    if (missions.length > 0) geocodeMissions();
  }, [missions]);

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
      const updatedMission = await missionService.applyToMission(applyingId, user.id, applyMessage);
      const updated = await missionService.getOpenMissions();
      setMissions(updated);
      showToast('Candidature envoyée !', 'success');

      // Notify patient by email
      if (updatedMission?.patientId) {
        const allUsers = await authService.getAllUsers();
        const patient = allUsers.find(u => u.id === updatedMission.patientId);
        if (patient?.email) {
          emailService.notifyNewApplication({
            patientEmail: patient.email,
            proName: `${user.firstName} ${user.lastName}`,
            mission: updatedMission,
            careTypeLabel: getCareLabel(updatedMission.careType),
            message: applyMessage,
          });
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
    setShowApplyModal(false);
  };

  // Build map markers
  const getMapMarkers = () => {
    const markers = [];

    // User position
    if (userCoords) {
      markers.push({
        lat: userCoords.lat,
        lng: userCoords.lng,
        label: 'Ma position',
        color: MARKER_COLORS.professional,
        popupContent: '<div class="map-popup-content"><strong>📍 Ma position</strong></div>',
      });
    }

    // Mission markers
    filtered.forEach(m => {
      const coords = m.address?.lat && m.address?.lng
        ? { lat: m.address.lat, lng: m.address.lng }
        : geocodedMissions[m.id]
          ? geocodedMissions[m.id]
          : CITY_COORDS[m.address?.city]
            ? CITY_COORDS[m.address.city]
            : null;

      if (coords) {
        markers.push({
          lat: coords.lat,
          lng: coords.lng,
          label: getCareLabel(m.careType),
          color: MARKER_COLORS.missionOpen,
          missionId: m.id,
          popupContent: `
            <div class="map-popup-content">
              <div class="map-popup-type">${getCareLabel(m.careType)}</div>
              <strong>${m.patientInfo?.name || 'Patient'}</strong>
              <div class="map-popup-address">📍 ${m.address?.street || ''}, ${m.address?.city || ''}</div>
              <div class="map-popup-time">📅 ${formatDate(m.scheduledDate)} · ${m.estimatedCost ? m.estimatedCost + ' €' : ''}</div>
            </div>
          `,
        });
      }
    });

    return markers;
  };

  // Radius circle for map
  const getRadiusCircle = () => {
    if (userCoords && cityFilter) {
      return { lat: userCoords.lat, lng: userCoords.lng, radius: radiusFilter };
    }
    if (cityFilter && CITY_COORDS[cityFilter]) {
      return { lat: CITY_COORDS[cityFilter].lat, lng: CITY_COORDS[cityFilter].lng, radius: radiusFilter };
    }
    return null;
  };

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
        {/* Header */}
        <div style={{ padding: 'var(--space-4) 0', marginBottom: 'var(--space-4)' }}>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            <Radar size={28} style={{ color: 'var(--color-primary-light)' }} className="pulse-glow" />
            Radar Missions
          </div>
          <p className="page-subtitle" style={{ color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{filtered.length} mission(s) disponible(s) à proximité</p>
        </div>

        {/* Filters */}
        <div className="glass-panel" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Filter size={16} />
              <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Filtres de recherche</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {/* View mode toggle */}
              <div style={{
                display: 'flex', borderRadius: 'var(--radius-full)', overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <button
                  onClick={() => setViewMode('map')}
                  style={{
                    padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px',
                    background: viewMode === 'map' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  <MapIcon size={12} /> Carte
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px',
                    background: viewMode === 'list' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  <List size={12} /> Liste
                </button>
              </div>
              <button
                onClick={handleGeolocate}
                disabled={locating}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: 'var(--radius-full)',
                  background: locating ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #06B6D4, #2563EB)',
                  color: 'white', border: 'none', fontSize: '12px', fontWeight: 600,
                  cursor: locating ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Crosshair size={14} style={{ animation: locating ? 'spin 1s linear infinite' : 'none' }} />
                {locating ? 'Localisation...' : 'Me localiser'}
              </button>
            </div>
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

        {/* Map View */}
        {viewMode === 'map' && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <InteractiveMap
              markers={getMapMarkers()}
              height={350}
              darkMode={true}
              radiusCircle={getRadiusCircle()}
              autoFit={true}
              onMarkerClick={(marker) => {
                if (marker.missionId) {
                  setHighlightedMission(marker.missionId);
                  // Scroll to mission in list below
                  const el = document.getElementById(`mission-${marker.missionId}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            />
          </div>
        )}

        {/* Missions List */}
        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
            <div className="empty-state-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}><Search size={28} /></div>
            <div className="empty-state-title" style={{ color: 'white' }}>Aucune mission trouvée</div>
            <div className="empty-state-text" style={{ color: 'rgba(255,255,255,0.7)' }}>Essayez d'élargir votre zone de recherche ou vos filtres.</div>
          </div>
        ) : (
          <div style={{ 
            display: viewMode === 'list' ? 'flex' : 'flex',
            flexDirection: viewMode === 'list' ? 'column' : 'row',
            overflowX: viewMode === 'list' ? 'visible' : 'auto',
            gap: 'var(--space-4)', 
            paddingBottom: 'calc(var(--bottom-nav-height) + 24px)', 
            ...(viewMode === 'list' ? {} : {
              margin: '0 calc(var(--content-padding) * -1)', 
              paddingLeft: 'var(--content-padding)', 
              paddingRight: 'var(--content-padding)', 
              scrollbarWidth: 'none'
            })
          }}>
            {filtered.map(mission => (
              <div 
                key={mission.id}
                id={`mission-${mission.id}`}
                style={{ 
                  minWidth: viewMode === 'list' ? 'auto' : '300px', 
                  maxWidth: viewMode === 'list' ? '100%' : '300px', 
                  display: 'flex', flexDirection: 'column',
                  background: highlightedMission === mission.id 
                    ? 'rgba(6, 182, 212, 0.2)' 
                    : 'rgba(30, 41, 59, 0.8)', 
                  backdropFilter: 'blur(20px)', borderRadius: 'var(--radius-xl)',
                  border: highlightedMission === mission.id 
                    ? '2px solid rgba(6, 182, 212, 0.5)' 
                    : '1px solid rgba(255,255,255,0.1)', 
                  overflow: 'hidden', 
                  boxShadow: highlightedMission === mission.id
                    ? '0 10px 40px -10px rgba(6, 182, 212, 0.3)'
                    : '0 10px 40px -10px rgba(0,0,0,0.5)',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 800, color: 'white' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#67E8F9', boxShadow: '0 0 10px #67E8F9' }} />
                      {getCareLabel(mission.careType)}
                    </div>
                    {cityFilter && mission.address?.city && (
                      <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '8px', color: 'white' }}>
                        {getDistanceLabel(cityFilter, mission.address.city) || mission.address.city}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: 'var(--space-4)', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'rgba(255,255,255,0.9)', fontSize: 'var(--font-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} color="#64748b" /> {formatDate(mission.scheduledDate)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={14} color="#64748b" /> {mission.address?.street ? `${mission.address.street}, ` : ''}{mission.address?.city}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={14} color="#64748b" /> {mission.estimatedDuration || '—'} minutes</div>
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
