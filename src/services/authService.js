// ── Auth Service ──
import { v4 as uuidv4 } from 'uuid';
import storageService from './storageService';

export const authService = {
  register({ email, password, role, firstName, lastName, phone }) {
    const users = storageService.getUsers();
    
    if (users.find(u => u.email === email)) {
      throw new Error('Un compte existe déjà avec cet email');
    }

    const user = {
      id: uuidv4(),
      email,
      password: btoa(password), // Simple encoding for demo
      role,
      firstName,
      lastName,
      phone: phone || '',
      avatar: null,
      createdAt: new Date().toISOString(),
      address: null,
      professionalInfo: role === 'professional' ? {
        specialties: [],
        serviceArea: { city: '', radius: 20 },
        availability: { days: [], hours: { start: '08:00', end: '18:00' } },
        bio: '',
        verified: false,
      } : null,
    };

    users.push(user);
    storageService.setUsers(users);
    
    const { password: _, ...safeUser } = user;
    storageService.setCurrentUser(safeUser);
    return safeUser;
  },

  login(email, password) {
    const users = storageService.getUsers();
    const user = users.find(u => u.email === email && u.password === btoa(password));
    
    if (!user) {
      throw new Error('Email ou mot de passe incorrect');
    }

    const { password: _, ...safeUser } = user;
    storageService.setCurrentUser(safeUser);
    return safeUser;
  },

  logout() {
    storageService.clearCurrentUser();
  },

  getCurrentUser() {
    return storageService.getCurrentUser();
  },

  updateProfile(userId, updates) {
    const users = storageService.getUsers();
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) throw new Error('Utilisateur non trouvé');

    users[index] = { ...users[index], ...updates };
    storageService.setUsers(users);
    
    const { password: _, ...safeUser } = users[index];
    storageService.setCurrentUser(safeUser);
    return safeUser;
  },

  getAllUsers() {
    return storageService.getUsers().map(({ password: _, ...u }) => u);
  },

  deleteUser(userId) {
    const users = storageService.getUsers().filter(u => u.id !== userId);
    storageService.setUsers(users);
  },

  toggleUserStatus(userId) {
    const users = storageService.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) return;
    users[index].disabled = !users[index].disabled;
    storageService.setUsers(users);
    return users[index];
  }
};

export default authService;
