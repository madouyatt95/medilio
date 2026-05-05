// ── Mission Radar (Premium Dark Glass Style) ──
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import authService from '../../services/authService';
import emailService from '../../services/emailService';
import { CARE_TYPES, CITIES_GEO } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import InteractiveMap from '../../components/InteractiveMap';
import {
  MapPin, Calendar, Clock, Filter, Search,
  Navigation, List, Map as MapIcon, ChevronRight,
  Target, Send, ArrowLeft
} from 'lucide-react';

export default function MissionRadar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotifications();
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [missions, setMissions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightedMission, setHighlightedMission] = useState(null);

  // Filters
  const [cityFilter, setCityFilter] = useState('');
  const [radiusFilter, setRadiusFilter] = useState(20);
  const [careFilter, setCareFilter] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  useEffect(() => {
    async function loadMissions() {
      try {
        const data = await missionService.getOpenMissions();
        setMissions(data);
        setFiltered(data);
      } catch (err) {
        showToast('Erreur lors du chargement des missions', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadMissions();
  }, []);

  // Filter logic
  useEffect(() => {
    let result = [...missions];

    if (cityFilter) {
      const cityGeo = CITIES_GEO[cityFilter];
      result = result.filter(m => {
        // If mission has lat/lng, calculate distance
        if (m.address?.lat && m.address?.lng && cityGeo) {
          const dist = calculateDistance(cityGeo.lat, cityGeo.lng, m.address.lat, m.address.lng);
          m.computedDistance = dist;
          return dist <= radiusFilter;
        }

        // Fallback: city name matching
        if (m.address?.city) {
          m.computedDistance = null;
          return m.address.city.toLowerCase().includes(cityFilter.toLowerCase()) ||
                 cityFilter.toLowerCase().includes(m.address.city.toLowerCase());
        }

        return true;
      });
    }

    if (careFilter) {
      result = result.filter(m => m.careType === careFilter);
    }
    setFiltered(result);
  }, [missions, cityFilter, radiusFilter, careFilter]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;
  const hasApplied = (mission) => mission.applicants?.some(a => a.proId === user?.id);

  const getMapMarkers = () => {
    return filtered.map(m => ({
      id: m.id,
      lat: m.address?.lat || 48.8566,
      lng: m.address?.lng || 2.3522,
      title: getCareLabel(m.careType),
      missionId: m.id,
      color: hasApplied(m) ? '#10B981' : '#06B6D4'
    }));
  };

  const getRadiusCircle = () => {
    if (!cityFilter) return null;
    const geo = CITIES_GEO[cityFilter];
    if (!geo) return null;
    return {
      center: [geo.lat, geo.lng],
      radius: radiusFilter * 1000 // meters
    };
  };

  const getDistanceLabel = (fCity, mCity) => {
    if (fCity.toLowerCase() === mCity.toLowerCase()) return 'Dans votre ville';
    return mCity;
  };

  if (loading) return <div className="loading-screen" style={{ background: '#0f172a' }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page-container" style={{ background: '#0f172a', minHeight: '100vh', color: 'white' }}>
      {/* Dynamic Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} style={{ color: 'white' }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, margin: 0 }}>Radar de Missions</h1>
            <p style={{ fontSize: 'var(--font-xs)', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              {filtered.length} missions disponibles
            </p>
          </div>
        </div>
        <div className="glass-pill" style={{ display: 'flex', gap: 4, padding: 4 }}>
          <button 
            onClick={() => setViewMode('map')}
            style={{ 
              padding: '8px 12px', borderRadius: '10px', border: 'none',
              background: viewMode === 'map' ? 'var(--color-primary)' : 'transparent',
              color: 'white', transition: 'all 0.3s'
            }}
          >
            <MapIcon size={18} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            style={{ 
              padding: '8px 12px', borderRadius: '10px', border: 'none',
              background: viewMode === 'list' ? 'var(--color-primary)' : 'transparent',
              color: 'white', transition: 'all 0.3s'
            }}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Glass Filters */}
      <div className="glass-panel" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-3)' }}>
          <div className="form-group" style={{ position: 'relative', marginBottom: 0 }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.5)' }}>
              <Navigation size={16} />
            </div>
            <input 
              className="form-input" 
              placeholder="Ville..."
              value={cityFilter}
              onChange={e => { setCityFilter(e.target.value); setShowCitySuggestions(true); }}
              onFocus={() => setShowCitySuggestions(true)}
              style={{ paddingLeft: '36px', fontSize: 'var(--font-sm)', background: 'rgba(255,255,255,0.9)', color: '#000' }}
            />
            {showCitySuggestions && cityFilter && (
              <ul className="glass-panel" style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                marginTop: 4, padding: 0, overflow: 'hidden', background: 'white'
              }}>
                {Object.keys(CITIES_GEO).filter(c => c.toLowerCase().includes(cityFilter.toLowerCase())).slice(0, 5).map(c => (
                  <li key={c} onClick={() => { setCityFilter(c); setShowCitySuggestions(false); }}
                    style={{ padding: '8px 12px', fontSize: 'var(--font-sm)', color: '#000', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}>
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
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

      {/* View Content */}
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
                const el = document.getElementById(`mission-${marker.missionId}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          />
        </div>
      )}

      {/* Missions List/Scroll */}
      {filtered.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
          <div className="empty-state-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}><Search size={28} /></div>
          <div className="empty-state-title" style={{ color: 'white' }}>Aucune mission trouvée</div>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
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
              onClick={() => navigate(`/pro/mission/${mission.id}`)}
              style={{ 
                minWidth: viewMode === 'list' ? 'auto' : '300px', 
                maxWidth: viewMode === 'list' ? '100%' : '300px', 
                display: 'flex', flexDirection: 'column',
                cursor: 'pointer',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 800, color: 'white' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#67E8F9', boxShadow: '0 0 10px #67E8F9' }} />
                    {getCareLabel(mission.careType)}
                  </div>
                  {mission.address?.city && (
                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '8px', color: 'white', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {mission.address.city}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ padding: 'var(--space-4)', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'rgba(255,255,255,0.9)', fontSize: 'var(--font-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} color="#64748b" /> {formatDate(mission.scheduledDate)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={14} color="#64748b" /> {mission.address?.city}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={14} color="#64748b" /> {mission.estimatedDuration || '—'} min</div>
                </div>
              </div>

              <div style={{ padding: 'var(--space-4)', background: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#67E8F9', fontWeight: 800, fontSize: 'var(--font-lg)' }}>{mission.estimatedCost ? `${mission.estimatedCost} €` : '-'}</div>
                {hasApplied(mission) ? (
                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: '14px' }}>Postulé ✓</span>
                ) : (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Voir détails <ChevronRight size={14} style={{ verticalAlign: 'middle' }} /></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
