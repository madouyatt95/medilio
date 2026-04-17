// ── Favorites Service ──
import storageService from './storageService';

const FAVORITES_KEY = 'medilio_favorites';

export const favoritesService = {
  getAll() {
    return storageService.get(FAVORITES_KEY) || [];
  },

  save(favorites) {
    storageService.set(FAVORITES_KEY, favorites);
  },

  // Get favorites for a patient
  getByPatient(patientId) {
    return this.getAll().filter(f => f.patientId === patientId);
  },

  // Check if a pro is favorited
  isFavorite(patientId, proId) {
    return this.getAll().some(f => f.patientId === patientId && f.proId === proId);
  },

  // Toggle favorite
  toggle(patientId, proId) {
    const favorites = this.getAll();
    const index = favorites.findIndex(f => f.patientId === patientId && f.proId === proId);
    if (index !== -1) {
      favorites.splice(index, 1);
      this.save(favorites);
      return false; // removed
    } else {
      favorites.push({
        patientId,
        proId,
        createdAt: new Date().toISOString(),
      });
      this.save(favorites);
      return true; // added
    }
  },

  // Get favorite pro IDs for a patient
  getFavoriteProIds(patientId) {
    return this.getByPatient(patientId).map(f => f.proId);
  },
};

export default favoritesService;
