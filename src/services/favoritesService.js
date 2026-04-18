// ── Favorites Service (Supabase) ──
import supabase from '../lib/supabase';

export const favoritesService = {
  async getByPatient(patientId) {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('patient_id', patientId);

    return (data || []).map(f => ({
      patientId: f.patient_id,
      proId: f.pro_id,
      createdAt: f.created_at,
    }));
  },

  async isFavorite(patientId, proId) {
    const { data } = await supabase
      .from('favorites')
      .select('patient_id')
      .eq('patient_id', patientId)
      .eq('pro_id', proId)
      .single();

    return !!data;
  },

  async toggle(patientId, proId) {
    const exists = await this.isFavorite(patientId, proId);

    if (exists) {
      await supabase
        .from('favorites')
        .delete()
        .eq('patient_id', patientId)
        .eq('pro_id', proId);
      return false; // removed
    } else {
      await supabase
        .from('favorites')
        .insert({ patient_id: patientId, pro_id: proId });
      return true; // added
    }
  },

  async getFavoriteProIds(patientId) {
    const favs = await this.getByPatient(patientId);
    return favs.map(f => f.proId);
  },
};

export default favoritesService;
