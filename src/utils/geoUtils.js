// ── Geo Utilities ──

// Haversine formula to calculate distance between two coordinates (in km)
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// French cities with approximate coordinates
export const CITY_COORDS = {
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Marseille': { lat: 43.2965, lng: 5.3698 },
  'Lyon': { lat: 45.7640, lng: 4.8357 },
  'Toulouse': { lat: 43.6047, lng: 1.4442 },
  'Nice': { lat: 43.7102, lng: 7.2620 },
  'Nantes': { lat: 47.2184, lng: -1.5536 },
  'Strasbourg': { lat: 48.5734, lng: 7.7521 },
  'Montpellier': { lat: 43.6108, lng: 3.8767 },
  'Bordeaux': { lat: 44.8378, lng: -0.5792 },
  'Lille': { lat: 50.6292, lng: 3.0573 },
  'Rennes': { lat: 48.1173, lng: -1.6778 },
  'Reims': { lat: 49.2583, lng: 4.0317 },
  'Saint-Étienne': { lat: 45.4397, lng: 4.3872 },
  'Toulon': { lat: 43.1242, lng: 5.9280 },
  'Le Havre': { lat: 49.4944, lng: 0.1079 },
  'Grenoble': { lat: 45.1885, lng: 5.7245 },
  'Dijon': { lat: 47.3220, lng: 5.0415 },
  'Angers': { lat: 47.4784, lng: -0.5632 },
  'Nîmes': { lat: 43.8367, lng: 4.3601 },
  'Clermont-Ferrand': { lat: 45.7772, lng: 3.0870 },
};

export function getCityCoords(city) {
  return CITY_COORDS[city] || null;
}

export function filterMissionsByProximity(missions, city, radiusKm) {
  const origin = getCityCoords(city);
  if (!origin) return missions;

  return missions.filter(m => {
    if (!m.address?.city) return false;
    const dest = getCityCoords(m.address.city);
    if (!dest) return m.address.city.toLowerCase() === city.toLowerCase();
    const dist = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
    return dist <= radiusKm;
  });
}

export function getDistanceLabel(city1, city2) {
  const c1 = getCityCoords(city1);
  const c2 = getCityCoords(city2);
  if (!c1 || !c2) return '';
  const dist = calculateDistance(c1.lat, c1.lng, c2.lat, c2.lng);
  if (dist < 1) return '< 1 km';
  return `${Math.round(dist)} km`;
}
