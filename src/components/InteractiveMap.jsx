// ── Interactive Map Component (Leaflet + OpenStreetMap) ──
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Fix Leaflet default marker icon (Vite/Webpack asset issue) ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom Marker Icons ──
function createCustomIcon(color, label) {
  return L.divIcon({
    className: 'map-custom-marker',
    html: `<div class="map-marker" style="--marker-color: ${color}">
      ${label ? `<span class="map-marker-label">${label}</span>` : ''}
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
  });
}

export const MARKER_COLORS = {
  mission: '#2563EB',
  missionOpen: '#06B6D4',
  missionAssigned: '#F59E0B',
  missionCompleted: '#10B981',
  professional: '#8B5CF6',
  patient: '#EF4444',
  current: '#3B82F6',
};

// ── Auto-fit Bounds Component ──
function FitBounds({ markers, padding = [50, 50] }) {
  const map = useMap();

  useEffect(() => {
    if (!markers || markers.length === 0) return;
    const validMarkers = markers.filter(m => m.lat && m.lng && isFinite(m.lat) && isFinite(m.lng));
    if (validMarkers.length === 0) return;

    const bounds = L.latLngBounds(validMarkers.map(m => [m.lat, m.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding, maxZoom: 15 });
    }
  }, [markers, map, padding]);

  return null;
}

// ── Recenter on prop change ──
function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

/**
 * @param {Object} props
 * @param {Array<{lat, lng, label?, popupContent?, color?, numberLabel?}>} props.markers
 * @param {[number, number]} [props.center] - [lat, lng]
 * @param {number} [props.zoom]
 * @param {number} [props.height] - CSS height in px
 * @param {boolean} [props.darkMode]
 * @param {Function} [props.onMarkerClick] - (marker, index) => void
 * @param {{lat, lng, radius}} [props.radiusCircle] - Optional circle overlay
 * @param {Array<[number, number]>} [props.polyline] - Array of [lat, lng] for route line
 * @param {boolean} [props.autoFit] - Auto fit bounds to markers
 */
export default function InteractiveMap({
  markers = [],
  center = [46.603354, 1.888334], // Center of France
  zoom = 6,
  height = 300,
  darkMode = false,
  onMarkerClick,
  radiusCircle,
  polyline,
  autoFit = true,
  className = '',
}) {
  const tileUrl = darkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution = darkMode
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  // Filter valid markers
  const validMarkers = markers.filter(m => m.lat && m.lng && isFinite(m.lat) && isFinite(m.lng));

  return (
    <div className={`interactive-map-container ${darkMode ? 'dark' : ''} ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer url={tileUrl} attribution={attribution} />

        {autoFit && validMarkers.length > 0 && <FitBounds markers={validMarkers} />}
        {!autoFit && center && <RecenterMap center={center} zoom={zoom} />}

        {/* Radius circle */}
        {radiusCircle && radiusCircle.lat && radiusCircle.lng && (
          <Circle
            center={[radiusCircle.lat, radiusCircle.lng]}
            radius={radiusCircle.radius * 1000} // km to meters
            pathOptions={{
              color: darkMode ? '#06B6D4' : '#2563EB',
              fillColor: darkMode ? '#06B6D4' : '#2563EB',
              fillOpacity: 0.08,
              weight: 2,
              dashArray: '8 4',
            }}
          />
        )}

        {/* Polyline for routes */}
        {polyline && polyline.length > 1 && (
          <Polyline
            positions={polyline}
            pathOptions={{
              color: darkMode ? '#67E8F9' : '#2563EB',
              weight: 3,
              opacity: 0.8,
              dashArray: '10 6',
            }}
          />
        )}

        {/* Markers */}
        {validMarkers.map((m, i) => (
          <Marker
            key={`${m.lat}-${m.lng}-${i}`}
            position={[m.lat, m.lng]}
            icon={createCustomIcon(
              m.color || MARKER_COLORS.mission,
              m.numberLabel || null
            )}
            eventHandlers={{
              click: () => onMarkerClick?.(m, i),
            }}
          >
            {(m.popupContent || m.label) && (
              <Popup>
                <div className="map-popup-content">
                  {m.popupContent || m.label}
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export { createCustomIcon, FitBounds, RecenterMap };
