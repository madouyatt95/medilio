// ── Storage Service (localStorage abstraction) ──

const STORAGE_KEYS = {
  USERS: 'medilio_users',
  MISSIONS: 'medilio_missions',
  NOTIFICATIONS: 'medilio_notifications',
  CURRENT_USER: 'medilio_current_user',
  CHATS: 'medilio_chats',
  RATINGS: 'medilio_ratings',
};

export const storageService = {
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
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
};

export { STORAGE_KEYS };
export default storageService;
