// ── Geocoding Service (API Géoplateforme IGN — gratuit, sans clé) ──

const BASE_URL = 'https://data.geopf.fr/geocodage';
const cache = new Map();

function cacheKey(type, query) {
  return `${type}:${query}`;
}

export const geocodingService = {
  /**
   * Autocomplétion d'adresses françaises
   * @param {string} query - Texte saisi par l'utilisateur
   * @param {number} limit - Nombre max de résultats
   * @returns {Promise<Array<{label, street, city, postcode, lat, lng, score}>>}
   */
  async searchAddress(query, limit = 5) {
    if (!query || query.trim().length < 3) return [];

    const key = cacheKey('search', `${query}:${limit}`);
    if (cache.has(key)) return cache.get(key);

    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}&type=housenumber&type=street`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const results = (data.features || []).map(f => ({
        label: f.properties.label,
        street: f.properties.name || '',
        city: f.properties.city || '',
        postcode: f.properties.postcode || '',
        context: f.properties.context || '',
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        score: f.properties.score || 0,
      }));

      cache.set(key, results);
      // Limiter la taille du cache
      if (cache.size > 200) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      return results;
    } catch (err) {
      console.warn('Geocoding search error:', err);
      return [];
    }
  },

  /**
   * Géocode une adresse complète en coordonnées
   * @param {string} street
   * @param {string} city
   * @param {string} postcode
   * @returns {Promise<{lat, lng, label} | null>}
   */
  async geocodeAddress(street, city, postcode) {
    const query = [street, city, postcode].filter(Boolean).join(' ');
    if (!query.trim()) return null;

    const key = cacheKey('geocode', query);
    if (cache.has(key)) return cache.get(key);

    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}&limit=1`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!data.features || data.features.length === 0) return null;

      const f = data.features[0];
      const result = {
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        label: f.properties.label,
      };

      cache.set(key, result);
      return result;
    } catch (err) {
      console.warn('Geocoding forward error:', err);
      return null;
    }
  },

  /**
   * Reverse geocoding : coordonnées → adresse
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<{label, street, city, postcode} | null>}
   */
  async reverseGeocode(lat, lng) {
    const key = cacheKey('reverse', `${lat},${lng}`);
    if (cache.has(key)) return cache.get(key);

    try {
      const url = `${BASE_URL}/reverse?lon=${lng}&lat=${lat}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!data.features || data.features.length === 0) return null;

      const f = data.features[0];
      const result = {
        label: f.properties.label,
        street: f.properties.name || '',
        city: f.properties.city || '',
        postcode: f.properties.postcode || '',
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      };

      cache.set(key, result);
      return result;
    } catch (err) {
      console.warn('Geocoding reverse error:', err);
      return null;
    }
  },

  /** Vider le cache */
  clearCache() {
    cache.clear();
  },
};

export default geocodingService;
