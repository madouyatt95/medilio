import supabase from '../lib/supabase';
import { assertBackendConfigured, isDemoMode } from '../config/runtime';
import storageService from './storageService';

const SELF_SERVICE_ROLES = new Set(['patient', 'professional', 'establishment']);

function mapProfile(data) {
  if (!data) return null;
  return {
    id: data.id,
    email: data.email || '',
    role: data.role,
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    phone: data.phone || '',
    avatar: data.avatar_url || null,
    createdAt: data.created_at,
    address: {
      street: data.street || '',
      city: data.city || '',
      postalCode: data.postal_code || '',
    },
    professionalInfo: data.role === 'professional' ? {
      specialties: data.specialties || [],
      serviceArea: { city: data.city || '', radius: data.radius || 20 },
      availability: data.availability || { days: [], hours: { start: '08:00', end: '18:00' } },
      bio: data.bio || '',
      verified: Boolean(data.verified),
    } : null,
    establishmentInfo: data.role === 'establishment' ? {
      name: data.establishment_name || '',
      type: data.establishment_type || '',
      finessNumber: data.finess_number || '',
      service: data.service || '',
      verified: Boolean(data.verified),
    } : null,
    disabled: Boolean(data.disabled),
  };
}

function mapPublicProfessional(data) {
  if (!data) return null;
  return {
    id: data.id,
    email: '',
    role: 'professional',
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    phone: '',
    avatar: data.avatar_url || null,
    address: { street: '', city: data.city || '', postalCode: '' },
    professionalInfo: {
      specialties: data.specialties || [],
      serviceArea: { city: data.city || '', radius: data.radius || 20 },
      bio: data.bio || '',
      verified: Boolean(data.verified),
      ratingAverage: Number(data.rating_average || 0),
      ratingCount: Number(data.rating_count || 0),
    },
    disabled: false,
  };
}

function mergeDemoProfile(existing, updates) {
  return {
    ...existing,
    ...updates,
    professionalInfo: updates.professionalInfo ? {
      ...(existing.professionalInfo || {}),
      ...updates.professionalInfo,
      serviceArea: {
        ...(existing.professionalInfo?.serviceArea || {}),
        ...(updates.professionalInfo.serviceArea || {}),
      },
    } : existing.professionalInfo,
    establishmentInfo: updates.establishmentInfo ? {
      ...(existing.establishmentInfo || {}),
      ...updates.establishmentInfo,
    } : existing.establishmentInfo,
    address: updates.address ? { ...(existing.address || {}), ...updates.address } : existing.address,
  };
}

export const authService = {
  async register(form) {
    assertBackendConfigured();
    if (!SELF_SERVICE_ROLES.has(form.role)) throw new Error('Type de compte invalide.');

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          role: form.role,
          phone: form.phone || '',
          street: form.street || '',
          city: form.city || '',
          postal_code: form.postalCode || '',
          establishment_name: form.establishmentName || '',
          establishment_type: form.establishmentType || '',
          finess_number: form.finessNumber || '',
          service: form.service || '',
        },
      },
    });

    if (error) throw new Error(error.message);
    if (!data.session) {
      return { profile: null, requiresEmailConfirmation: true, email: form.email };
    }

    const profile = await this.getProfile(data.user.id);
    if (!profile) throw new Error('Le profil n’a pas pu être initialisé.');
    return { profile, requiresEmailConfirmation: false };
  },

  async login(email, password) {
    if (isDemoMode) {
      const demoUser = storageService.getUsers().find(user => user.email === email);
      if (demoUser?.password === btoa(password)) {
        storageService.setCurrentUser(demoUser);
        return demoUser;
      }
      throw new Error('Identifiants de démonstration invalides.');
    }

    assertBackendConfigured();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Email ou mot de passe incorrect.');

    const profile = await this.getProfile(data.user.id);
    if (!profile) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('Profil utilisateur introuvable.');
    }
    if (profile.disabled) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('Ce compte a été suspendu. Contactez l’administrateur Medilio.');
    }
    return profile;
  },

  async logout() {
    storageService.clearCurrentUser();
    if (!isDemoMode) await supabase.auth.signOut({ scope: 'local' });
  },

  async getCurrentSession() {
    if (isDemoMode) return null;
    assertBackendConfigured();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getCurrentUser() {
    if (isDemoMode) return storageService.getCurrentUser();
    assertBackendConfigured();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    const profile = await this.getProfile(user.id);
    if (profile?.disabled) {
      await supabase.auth.signOut({ scope: 'local' });
      return null;
    }
    return profile;
  },

  async getProfile(userId) {
    if (isDemoMode) {
      return storageService.getUsers().find(user => user.id === userId) || null;
    }
    assertBackendConfigured();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    return mapProfile(data);
  },

  async getPublicProfessional(userId) {
    if (isDemoMode) return this.getProfile(userId);
    assertBackendConfigured();
    const { data, error } = await supabase.rpc('get_public_professionals', { p_profile_id: userId });
    if (error) throw new Error(error.message);
    return mapPublicProfessional(data?.[0]);
  },

  async getPublicProfessionals() {
    if (isDemoMode) {
      return storageService.getUsers().filter(user => user.role === 'professional' && !user.disabled);
    }
    assertBackendConfigured();
    const { data, error } = await supabase.rpc('get_public_professionals', { p_profile_id: null });
    if (error) throw new Error(error.message);
    return (data || []).map(mapPublicProfessional);
  },

  async updateProfile(userId, updates) {
    if (isDemoMode) {
      const users = storageService.getUsers();
      const index = users.findIndex(user => user.id === userId);
      if (index === -1) throw new Error('Profil introuvable.');
      const updated = mergeDemoProfile(users[index], updates);
      users[index] = updated;
      storageService.setUsers(users);
      if (storageService.getCurrentUser()?.id === userId) storageService.setCurrentUser(updated);
      return updated;
    }

    assertBackendConfigured();
    const dbUpdates = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
    if (updates.address) {
      if (updates.address.street !== undefined) dbUpdates.street = updates.address.street;
      if (updates.address.city !== undefined) dbUpdates.city = updates.address.city;
      if (updates.address.postalCode !== undefined) dbUpdates.postal_code = updates.address.postalCode;
    }
    if (updates.professionalInfo) {
      if (updates.professionalInfo.specialties !== undefined) dbUpdates.specialties = updates.professionalInfo.specialties;
      if (updates.professionalInfo.bio !== undefined) dbUpdates.bio = updates.professionalInfo.bio;
      if (updates.professionalInfo.serviceArea?.radius !== undefined) dbUpdates.radius = updates.professionalInfo.serviceArea.radius;
      if (updates.professionalInfo.serviceArea?.city !== undefined) dbUpdates.city = updates.professionalInfo.serviceArea.city;
      if (updates.professionalInfo.availability !== undefined) dbUpdates.availability = updates.professionalInfo.availability;
    }
    if (updates.establishmentInfo) {
      if (updates.establishmentInfo.name !== undefined) dbUpdates.establishment_name = updates.establishmentInfo.name;
      if (updates.establishmentInfo.type !== undefined) dbUpdates.establishment_type = updates.establishmentInfo.type;
      if (updates.establishmentInfo.finessNumber !== undefined) dbUpdates.finess_number = updates.establishmentInfo.finessNumber;
      if (updates.establishmentInfo.service !== undefined) dbUpdates.service = updates.establishmentInfo.service;
    }

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
    if (error) throw new Error(error.message);
    return this.getProfile(userId);
  },

  async getAllUsers() {
    if (isDemoMode) return storageService.getUsers();
    assertBackendConfigured();
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapProfile);
  },

  async toggleUserStatus(userId) {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('Profil introuvable.');
    const { error } = await supabase.from('profiles').update({ disabled: !profile.disabled }).eq('id', userId);
    if (error) throw new Error(error.message);
    return this.getProfile(userId);
  },

  async toggleVerification(userId) {
    const profile = await this.getProfile(userId);
    if (!profile || !['professional', 'establishment'].includes(profile.role)) {
      throw new Error('Ce profil ne peut pas être vérifié.');
    }
    const verified = profile.role === 'professional'
      ? profile.professionalInfo?.verified
      : profile.establishmentInfo?.verified;
    const { error } = await supabase.from('profiles').update({ verified: !verified }).eq('id', userId);
    if (error) throw new Error(error.message);
    return this.getProfile(userId);
  },

  onAuthStateChange(callback) {
    if (isDemoMode) return { data: { subscription: { unsubscribe() {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default authService;
