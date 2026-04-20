// ── Auth Service (Hybrid Supabase/Local Demo) ──
import supabase from '../lib/supabase';
import storageService from './storageService';

export const authService = {
  async register({ email, password, role, firstName, lastName, phone }) {
    // 1. Create auth user with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
        },
      },
    });

    if (authError) throw new Error(authError.message);

    // 2. Update the profile with extra fields (trigger creates the base profile)
    const userId = authData.user?.id;
    if (userId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: phone || '',
          city: '',
          street: '',
          postal_code: '',
          specialties: role === 'professional' ? [] : null,
          bio: role === 'professional' ? '' : null,
          radius: role === 'professional' ? 20 : null,
        })
        .eq('id', userId);

      if (profileError) {
        console.warn('Profile update warning:', profileError.message);
      }
    }

    // 3. Fetch the full profile
    const profile = await this.getProfile(userId);
    return profile;
  },

  async login(email, password) {
    // ── Demo Fallback ──
    const demoUsers = storageService.getUsers();
    const demoUser = demoUsers.find(u => u.email === email);
    
    if (demoUser) {
      // Basic check: demo password is btoa(raw) in seeder
      if (demoUser.password === btoa(password)) {
        storageService.setCurrentUser(demoUser);
        return demoUser;
      }
      throw new Error('Identifiants de démonstration invalides.');
    }

    // ── Supabase Login ──
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);

    const profile = await this.getProfile(data.user.id);
    return profile;
  },

  async logout() {
    storageService.clearCurrentUser();
    const { error } = await supabase.auth.signOut();
    // No throw on signout error to allow local logout even if offline
  },

  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getCurrentUser() {
    // Check local demo session first
    const localUser = storageService.getCurrentUser();
    if (localUser) return localUser;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return this.getProfile(user.id);
  },

  async getProfile(userId) {
    // Check local demo users first
    const demoUsers = storageService.getUsers();
    const demoProfile = demoUsers.find(u => u.id === userId);
    if (demoProfile) return demoProfile;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;

    // Map DB columns to the app format for backwards compat
    return {
      id: data.id,
      role: data.role,
      firstName: data.first_name,
      lastName: data.last_name,
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
        availability: { days: [], hours: { start: '08:00', end: '18:00' } },
        bio: data.bio || '',
        verified: data.verified || false,
      } : null,
      disabled: data.disabled || false,
    };
  },

  async updateProfile(userId, updates) {
    // Map app format back to DB columns
    const dbUpdates = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.address) {
      if (updates.address.street !== undefined) dbUpdates.street = updates.address.street;
      if (updates.address.city !== undefined) dbUpdates.city = updates.address.city;
      if (updates.address.postalCode !== undefined) dbUpdates.postal_code = updates.address.postalCode;
    }
    if (updates.professionalInfo) {
      if (updates.professionalInfo.specialties) dbUpdates.specialties = updates.professionalInfo.specialties;
      if (updates.professionalInfo.bio !== undefined) dbUpdates.bio = updates.professionalInfo.bio;
      if (updates.professionalInfo.serviceArea?.radius) dbUpdates.radius = updates.professionalInfo.serviceArea.radius;
      if (updates.professionalInfo.serviceArea?.city) dbUpdates.city = updates.professionalInfo.serviceArea.city;
      if (updates.professionalInfo.verified !== undefined) dbUpdates.verified = updates.professionalInfo.verified;
    }
    if (updates.disabled !== undefined) dbUpdates.disabled = updates.disabled;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId);

    if (error) throw new Error(error.message);

    return this.getProfile(userId);
  },

  async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return data.map(p => ({
      id: p.id,
      role: p.role,
      firstName: p.first_name,
      lastName: p.last_name,
      phone: p.phone || '',
      avatar: p.avatar_url || null,
      createdAt: p.created_at,
      address: { street: p.street || '', city: p.city || '', postalCode: p.postal_code || '' },
      professionalInfo: p.role === 'professional' ? {
        specialties: p.specialties || [],
        serviceArea: { city: p.city || '', radius: p.radius || 20 },
        bio: p.bio || '',
        verified: p.verified || false,
      } : null,
      disabled: p.disabled || false,
    }));
  },

  async toggleUserStatus(userId) {
    // Get current status
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    const { error } = await supabase
      .from('profiles')
      .update({ disabled: !profile.disabled })
      .eq('id', userId);

    if (error) throw new Error(error.message);
    return this.getProfile(userId);
  },

  // Subscribe to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default authService;
