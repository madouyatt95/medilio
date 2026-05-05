// ── Mission Radar (Premium Dark Glass Style - Enhanced) ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import { CARE_TYPES } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import InteractiveMap from '../../components/InteractiveMap';
import {
  MapPin, Calendar, Clock, Search,
  Navigation, List, Map as MapIcon, ChevronRight,
  ArrowLeft, Crosshair
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
  const [apiCities, setApiCities] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [selectedCityCoords, setSelectedCityCoords] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);

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

  // API Gouv for city suggestions
  useEffect(() => {
    if (!cityFilter || cityFilter.length < 2) {
      setApiCities([]);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${cityFilter}&fields=nom,centre&limit=5`);
        const data = await res.json();
        setApiCities(data.map(d => ({ nom: d.nom, coords: d.centre?.coordinates })));
      } catch (e) {
        console.error('City fetch error', e);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [cityFilter]);

  // GPS Geolocation
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      showToast('Géolocalisation non disponible', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = { lat: latitude, lng: longitude };
        setUserCoords(coords);
        setSelectedCityCoords(coords);
        setCityFilter('Ma position');
        setLocating(false);
        showToast('Localisé !', 'success');
      },
      (err) => {
        console.error(err);
        setLocating(false);
        showToast('Erreur de localisation', 'error');
      }
    );
  };

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

  // Filter logic
  useEffect(() => {
    let result = [...missions];
    const origin = selectedCityCoords || userCoords;

    if (origin) {
      result = result.filter(m => {
        if (m.address?.lat && m.address?.lng) {
          const dist = calculateDistance(origin.lat, origin.lng, m.address.lat, m.address.lng);
          m.computedDistance = dist;
          return dist <= radiusFilter;
        }
        return true;
      });
    }

    if (careFilter) {
      result = result.filter(m => m.careType === careFilter);
    }
    setFiltered(result);
  }, [missions, selectedCityCoords, userCoords, radiusFilter, careFilter]);

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  const getMapMarkers = () => {
    const markers = filtered.map(m => ({
      id: m.id,
      lat: m.address?.lat || 48.8566,
      lng: m.address?.lng || 2.3522,
      title: getCareLabel(m.careType),
      missionId: m.id,
      color: m.applicants?.some(a => a.proId === user?.id) ? '#10B981' : '#06B6D4'
    }));

    if (userCoords) {
      markers.push({
        lat: userCoords.lat,
        lng: userCoords.lng,
        title: 'Ma position',
        color: '#F43F5E',
        isCurrentPos: true
      });
    }

    if (selectedCityCoords && !userCoords) {
      markers.push({
        lat: selectedCityCoords.lat,
        lng: selectedCityCoords.lng,
        title: cityFilter,
        color: '#6366F1'
      });
    }

    return markers;
  };

  const getRadiusCircle = () => {
    const origin = selectedCityCoords || userCoords;
    if (!origin) return null;
    return {
      lat: origin.lat,
      lng: origin.lng,
      radius: radiusFilter // Send in km, InteractiveMap converts to meters
    };
  };

  if (loading) return <div className="loading-screen" style={{ background: '#0f172a' }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page-container" style={{ background: '#0f172a', minHeight: '100vh', color: 'white', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} style={{ color: 'white' }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, margin: 0 }}>Radar Missions</h1>
            <p style={{ fontSize: 'var(--font-xs)', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              {filtered.length} missions trouvées
            </p>
          </div>
        </div>
        <div className="glass-pill" style={{ display: 'flex', gap: 4, padding: 4 }}>
          <button onClick={() => setViewMode('map')}
            style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', background: viewMode === 'map' ? 'var(--color-primary)' : 'transparent', color: 'white' }}>
            <MapIcon size={18} />
          </button>
          <button onClick={() => setViewMode('list')}
            style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', background: viewMode === 'list' ? 'var(--color-primary)' : 'transparent', color: 'white' }}>
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Filters with high z-index */}
      <div className="glass-panel" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 1000 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-3)' }}>
          <div className="form-group" style={{ position: 'relative', marginBottom: 0 }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.5)', display: 'flex', gap: 8 }}>
              <Navigation size={16} />
            </div>
            <input 
              className="form-input" 
              placeholder="Ville..."
              value={cityFilter}
              onChange={e => { setCityFilter(e.target.value); setShowCitySuggestions(true); }}
              onFocus={() => setShowCitySuggestions(true)}
              style={{ paddingLeft: '36px', fontSize: 'var(--font-sm)', background: 'white', color: '#000' }}
            />
            {/* Suggestions List */}
            {showCitySuggestions && apiCities.length > 0 && (
              <div className="glass-panel" style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1100,
                marginTop: 4, padding: 0, background: 'white', color: 'black',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)', border: '1px solid var(--border-light)'
              }}>
                {apiCities.map((c, i) => (
                  <div key={i} 
                    onClick={() => {
                      setCityFilter(c.nom);
                      setSelectedCityCoords({ lat: c.coords[1], lng: c.coords[0] });
                      setUserCoords(null);
                      setShowCitySuggestions(false);
                    }}
                    style={{ padding: '12px 16px', fontSize: 'var(--font-sm)', cursor: 'pointer', borderBottom: i < apiCities.length - 1 ? '1px solid #eee' : 'none' }}>
                    {c.nom}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select className="form-input form-select" value={careFilter}
              onChange={e => setCareFilter(e.target.value)} style={{ fontSize: 'var(--font-sm)', background: 'white', color: '#000' }}>
              <option value="">Tous les types</option>
              {CARE_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: 4, display: 'block' }}>Rayon : {radiusFilter} km</label>
            <input type="range" min="5" max="100" step="5" value={radiusFilter}
              onChange={e => setRadiusFilter(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary-light)' }} />
          </div>
          <button className={`btn btn-sm ${locating ? 'btn-ghost' : 'btn-secondary'}`} 
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', height: '36px' }}
            onClick={handleGeolocate}>
            <Crosshair size={14} style={{ marginRight: 6 }} /> {locating ? '...' : 'GPS'}
          </button>
        </div>
      </div>

      {/* Map Content */}
      {viewMode === 'map' && (
        <div style={{ marginBottom: 'var(--space-5)', position: 'relative', zIndex: 10 }}>
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

      {/* List/Horizontal Scroll */}
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
        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)', width: '100%' }}>
            <Search size={32} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 'var(--space-3)' }} />
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>Aucune mission dans cette zone</div>
          </div>
        ) : (
          filtered.map(mission => (
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
                  ? 'rgba(6, 182, 212, 0.25)' 
                  : 'rgba(30, 41, 59, 0.8)', 
                backdropFilter: 'blur(20px)', borderRadius: 'var(--radius-xl)',
                border: highlightedMission === mission.id 
                  ? '2px solid #06B6D4' 
                  : '1px solid rgba(255,255,255,0.1)', 
                overflow: 'hidden', 
                boxShadow: highlightedMission === mission.id
                  ? '0 0 20px rgba(6, 182, 212, 0.4)'
                  : '0 10px 40px -10px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#67E8F9', boxShadow: '0 0 8px #67E8F9' }} />
                    {getCareLabel(mission.careType)}
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                    {mission.computedDistance ? `${mission.computedDistance.toFixed(1)} km` : mission.address?.city}
                  </span>
                </div>
              </div>

              <div style={{ padding: 'var(--space-4)', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--font-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.8)' }}>
                    <Calendar size={14} color="#06B6D4" /> {formatDate(mission.scheduledDate)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.8)' }}>
                    <MapPin size={14} color="#06B6D4" /> {mission.address?.city}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.8)' }}>
                    <Clock size={14} color="#06B6D4" /> {mission.estimatedDuration || '—'} min
                  </div>
                </div>
              </div>

              <div style={{ padding: 'var(--space-4)', background: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#67E8F9', fontWeight: 800, fontSize: 'var(--font-lg)' }}>{mission.estimatedCost ? `${mission.estimatedCost} €` : '-'}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Voir détails <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
