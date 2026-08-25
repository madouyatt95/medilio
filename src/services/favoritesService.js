// ── Favorites Service (Supabase) ──
import supabase from '../lib/supabase';
import storageService from './storageService';
import { isDemoMode } from '../config/runtime';

export const favoritesService = {
  async getByPatient(patientId) {
    if (isDemoMode) {
      return storageService.getFavorites().filter(favorite => favorite.patientId === patientId);
    }
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('patient_id', patientId);

    if (error) throw new Error(error.message);
    return (data || []).map(f => ({
      patientId: f.patient_id,
      proId: f.pro_id,
      createdAt: f.created_at,
    }));
  },

  async isFavorite(patientId, proId) {
    if (isDemoMode) {
      return storageService.getFavorites().some(favorite =>
        favorite.patientId === patientId && favorite.proId === proId
      );
    }
    const { data, error } = await supabase
      .from('favorites')
      .select('patient_id')
      .eq('patient_id', patientId)
      .eq('pro_id', proId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return !!data;
  },

  async toggle(patientId, proId) {
    const exists = await this.isFavorite(patientId, proId);

    if (isDemoMode) {
      const favorites = storageService.getFavorites();
      if (exists) {
        storageService.setFavorites(favorites.filter(favorite =>
          favorite.patientId !== patientId || favorite.proId !== proId
        ));
        return false;
      }
      storageService.setFavorites([
        ...favorites,
        { patientId, proId, createdAt: new Date().toISOString() },
      ]);
      return true;
    }

    if (exists) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('patient_id', patientId)
        .eq('pro_id', proId);
      if (error) throw new Error(error.message);
      return false;
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ patient_id: patientId, pro_id: proId });
      if (error) throw new Error(error.message);
      return true;
    }
  },

  async getFavoriteProIds(patientId) {
    const favs = await this.getByPatient(patientId);
    return favs.map(f => f.proId);
  },
};

export default favoritesService;
