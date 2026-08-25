// ── Storage Service (localStorage abstraction) ──

const STORAGE_KEYS = {
  USERS: 'medilio_users',
  MISSIONS: 'medilio_missions',
  NOTIFICATIONS: 'medilio_notifications',
  CURRENT_USER: 'medilio_current_user',
  CHATS: 'medilio_chats',
  RATINGS: 'medilio_ratings',
  FAVORITES: 'medilio_favorites',
};

const sessionFallback = new Map();

export const storageService = {
  get(key) {
    try {
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
    } catch {
      // Some private/embedded browsers disable localStorage. Demo mode still
      // remains usable for the current tab through the in-memory fallback.
    }
    return sessionFallback.has(key) ? sessionFallback.get(key) : null;
  },

  set(key, value) {
    sessionFallback.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    sessionFallback.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      // In-memory state has already been cleared.
    }
  },

  // Users
  getUsers() {
    return this.get(STORAGE_KEYS.USERS) || [];
  },
  setUsers(users) {
    this.set(STORAGE_KEYS.USERS, users);
  },

  // Missions
  getMissions() {
    return this.get(STORAGE_KEYS.MISSIONS) || [];
  },
  setMissions(missions) {
    this.set(STORAGE_KEYS.MISSIONS, missions);
  },

  // Current User
  getCurrentUser() {
    return this.get(STORAGE_KEYS.CURRENT_USER);
  },
  setCurrentUser(user) {
    this.set(STORAGE_KEYS.CURRENT_USER, user);
  },
  clearCurrentUser() {
    this.remove(STORAGE_KEYS.CURRENT_USER);
  },

  // Notifications
  getNotifications() {
    return this.get(STORAGE_KEYS.NOTIFICATIONS) || [];
  },
  setNotifications(notifications) {
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifications);
  },
  // Chats
  getChats() {
    return this.get(STORAGE_KEYS.CHATS) || [];
  },
  setChats(chats) {
    this.set(STORAGE_KEYS.CHATS, chats);
  },
  // Ratings
  getRatings() {
    return this.get(STORAGE_KEYS.RATINGS) || [];
  },
  setRatings(ratings) {
    this.set(STORAGE_KEYS.RATINGS, ratings);
  },
  // Favorites
  getFavorites() {
    return this.get(STORAGE_KEYS.FAVORITES) || [];
  },
  setFavorites(favorites) {
    this.set(STORAGE_KEYS.FAVORITES, favorites);
  },
};

export { STORAGE_KEYS };
export default storageService;
